/*
 Copyright (c) 2017, Kotaro Endo.
 All rights reserved.
 
 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions
 are met:
 
 1. Redistributions of source code must retain the above copyright
    notice, this list of conditions and the following disclaimer.
 
 2. Redistributions in binary form must reproduce the above
    copyright notice, this list of conditions and the following
    disclaimer in the documentation and/or other materials provided
    with the distribution.
 
 3. Neither the name of the copyright holder nor the names of its
    contributors may be used to endorse or promote products derived
    from this software without specific prior written permission.
 
 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

require('../harness')
global.AtomicBroadcast = require('../../src/AtomicBroadcast')
global.PromiseContext = require('PromiseContext')

global.N = 3
global.F = 1
global.M = 2
global.BUFFER_QUEUE = 5
global.BUFFER_SEQS = 5
global.HISTORY_SEQS = 10
global.COLLAPSE_SEQS = 1
global.COLLAPSE_ROUNDS = 5
global.MERGE_ROUNDS = 4
global.AUTO_START = true

global.ctx = new PromiseContext()
global.abs = []
global.ipcs = []
global.vlogs = []
global.IPC_schedule = setImmediate
global.VLog_schedule = setImmediate
global.valueCounts = {}
global.receivedSeqs = []
global.resultValues = []

global.initEnv = function() {
    debug("====================")
    debug(" N=" + N + " F=" + F + " M=" + M + " BUFFER_QUEUE=" + BUFFER_QUEUE)
    debug(" BUFFER_SEQS=" + BUFFER_SEQS + " HISTORY_SEQS=" + HISTORY_SEQS + " COLLAPSE_SEQS=" + COLLAPSE_SEQS)
    debug(" COLLAPSE_ROUNDS=" + COLLAPSE_ROUNDS + " MERGE_ROUNDS=" + MERGE_ROUNDS)
    abs = []
    ipcs = []
    vlogs = []
    valueCounts = {}
    receivedSeqs = []
    resultValues = []
    for (let i = 0; i < N; i++) {
		receivedSeqs[i] = -1
        var config = {
            N: N,
            F: F,
            M: M,
            BUFFER_QUEUE: BUFFER_QUEUE,
            BUFFER_SEQS: BUFFER_SEQS,
            HISTORY_SEQS: HISTORY_SEQS,
            COLLAPSE_SEQS: COLLAPSE_SEQS,
            COLLAPSE_ROUNDS: COLLAPSE_ROUNDS,
            MERGE_ROUNDS: MERGE_ROUNDS,
        }
        ipcs[i] = new IPC(i)
        vlogs[i] = new VLog(i)
        abs[i] = new AtomicBroadcast(config, ipcs[i], vlogs[i])
        abs[i].onReceive = function(value, seq) {
            value = value.map(e => e.tag)
            trace(i + " receive " + seq + ":" + value)
            assert_equals(++receivedSeqs[i], seq)
            if (!resultValues[seq]) resultValues[seq] = value
            resultValues[seq].forEach((e, i) => assert_equals(e, value[i]))
            value.forEach(e => valueCounts[e] = ~~valueCounts[e] + 1)
        }
		abs[i].onSkip = function(to, from) {
			trace(i + " skip " + from + ":" + to)
            assert_equals(++receivedSeqs[i], seq)
			receivedSeqs[i] = to
		}
        if (AUTO_START) abs[i].start()
    }
}

global.closeEnv = function() {
    for (var i = 0; i < N; i++) {
        abs[i].close()
    }
}

global.IPC = class {
    constructor(from) {
        this.from = from
        this.connected = {}
    }

    start() {
        trace("IPC start " + this.from)
        var from = this.from
        ipcs[from] = this
        var fromIPC = this
        for (let to in ipcs) {
            if (from == to) continue
            let toIPC = ipcs[to]
            if (!toIPC) continue
            IPC_schedule(function() {
                if (ipcs[from] !== fromIPC) return
                if (ipcs[to] !== toIPC) return
                trace("IPC connecting " + from + " to " + to)
                toIPC.connected[from] = fromIPC
                fromIPC.connected[to] = toIPC
                toIPC.onConnected(from)
                fromIPC.onConnected(to)
            })
        }
    }

    close() {
        trace("IPC close " + this.from)
        ipcs[this.from] = null
        this.connected = {}
    }

    send(pkt, to) {
        var from = this.from
        assert(from != to)
        var pkt = obj_copy(pkt)
        var fromIPC = this
        var toIPC = ipcs[to]
        if (!toIPC || toIPC.connected[from] != fromIPC) return false
        if (ipcs[from] !== fromIPC || fromIPC.connected[to] != toIPC) return false
        IPC_schedule(function() {
            if (ipcs[to] !== toIPC || toIPC.connected[from] != fromIPC) return
            if (ipcs[from] !== fromIPC || fromIPC.connected[to] != toIPC) return
            if (pkt.type == 'vote') {
                trace("send vote " + from + " to " + to + " seq=" + pkt.seq + " r=" + pkt.round)
            }
            if (pkt.type == 'update') {
                trace("send update " + from + " to " + to + " cbkSeq=" + pkt.cbkSeq)
            }
            toIPC.onReceive(pkt, from)
        })
        return true
    }

    onConnected(to) {}
    onDrain(to) {}
    onReceive(pkt, from) {}
}

global.VLog = class {
    constructor(name) {
        this.name = name
        this.votes = []
        this.closed = true
        this.minSeq = 0
        this.sessionID = 0
    }

    start() {
        assert(this.closed)
        this.closed = false
        this.sessionID++;
        for (var vote of this.votes) {
            if (vote.seq < this.minSeq) continue
            trace(this.name + " read vote.seq=" + vote.seq + " vote.round=" + vote.round)
            this.onRead(vote)
        }
        this.onRecovered(this.minSeq)
    }

    close() {
        assert(!this.closed)
        this.closed = true
    }

    write(vote, callback) {
        var vote = obj_copy(vote)
        var sessionID = this.sessionID
        var self = this
        VLog_schedule(function() {
            if (self.closed || self.sessionID !== sessionID) return
            self.votes.push(vote)
            trace(self.name + " write vote.seq=" + vote.seq + " vote.round=" + vote.round)
            callback()
        })
    }

    updateMinSeq(minSeq) {
        if (this.minSeq >= minSeq) return
        this.minSeq = minSeq
    }

    onRead(vote) {}
    onRecovered(minSeq) {}
}

global.dump = function() {
    if (!debug_flag) return
    var seqs = []
    for (var i = 0; i < N; i++) {
        var ab = abs[i]
        for (var s in ab.states) {
            var cs = ab.states[s]
            var seq = cs.seq
            if (seq < ab.minSeq) continue
            if (seqs.indexOf(seq) >= 0) continue
            seqs.push(seq)
        }
    }
    seqs.sort((x, y) => (x - y))
    for (var i in seqs) {
        dump1(seqs[i])
    }
}

global.dump1 = function(seq) {
    if (!debug_flag) return
    var line = '(' + seq + ')'
    for (var i = 0; i < N; i++) {
        var ab = abs[i]
        var cs = ab.states[seq - ab.statesBase] || {
            round: 0
        }
        line += ' '
        var s = ''
        if (cs.agreed) {
            s += '*'
        } else {
            s += cs.round
        }
        if (seq < ab.minSeq) {
            s += '<'
        } else if (seq > ab.maxSeq) {
            s += '>'
        } else if (cs.committed) {
            s += ':'
        } else {
            s += '-'
        }
        if (cs.vote) {
            var value = cs.vote.value
            value.forEach(v => s += v.tag)
        }
        s = (s + '              ').substring(0, 8)
        line += s
    }
    console.log(line)
}

global.envTests = function(test, loop) {
    ctx.loop(function() {
        if (--loop < 0) ctx.break()
        BUFFER_QUEUE = randomInt(4) + 1
        BUFFER_SEQS = randomInt(4) + 1
        HISTORY_SEQS = randomInt(8) + 1
        COLLAPSE_SEQS = randomInt(2)
        COLLAPSE_ROUNDS = randomInt(5)
        MERGE_ROUNDS = randomInt(4)
        ctx.call(initEnv)
        ctx.call(test)
        ctx.call(dump)
        ctx.call(closeEnv)
    })
}
