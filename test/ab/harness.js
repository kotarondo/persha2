// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

'use strict'

require('../harness')
global.AtomicBroadcast = require('../../src/AtomicBroadcast')
global.PromiseContext = require('promise-context')

global.N = 3
global.F = 1
global.M = 2
global.BUFFER_QUEUE = 1
global.BUFFER_SEQS = 5
global.HISTORY_SEQS = 10
global.MERGE_ROUNDS = 4
global.AUTO_START = true

global.abs = []
global.ipcs = []
global.vlogs = []
global.valueCounts = {}
global.seqCounts = []
global.resultValues = []
global.receivedSeqs = []
global.receivedSeqMax = -1

function makeConfig() {
    return {
        N: N,
        F: F,
        M: M,
        BUFFER_QUEUE: BUFFER_QUEUE,
        BUFFER_SEQS: BUFFER_SEQS,
        HISTORY_SEQS: HISTORY_SEQS,
        MERGE_ROUNDS: MERGE_ROUNDS,
    }
}

global.initEnv = function() {
    debug("====================")
    debug(" N=" + N + " F=" + F + " M=" + M + " BUFFER_QUEUE=" + BUFFER_QUEUE)
    debug(" BUFFER_SEQS=" + BUFFER_SEQS + " HISTORY_SEQS=" + HISTORY_SEQS + " MERGE_ROUNDS=" + MERGE_ROUNDS)
    abs = []
    ipcs = []
    vlogs = []
    valueCounts = Object.create(toStringCustomized)
    seqCounts = []
    resultValues = []
    receivedSeqs = []
    receivedSeqMax = -1
    for (var i = 0; i < N; i++) {
        restartEnv(i)
    }
}

global.restartEnv = function(i, broken) {
    trace('test', i + " restart")
    if (abs[i]) abs[i].close()
    receivedSeqs[i] = -1
    if (!broken) {
        vlogs[i] = new VLog(vlogs[i] || String(i))
    } else {
        vlogs[i] = new VLog(String(i))
        vlogs[i].broken = true
    }
    abs[i] = new AtomicBroadcast(makeConfig(), new IPC(i), vlogs[i])
    abs[i].onReceive = function(value, seq) {
        value = value.map(e => e.tag)
        trace('receive', i + " receive " + seq + ":" + value)
        assert_equals(++receivedSeqs[i], seq)
        if (!resultValues[seq]) resultValues[seq] = value
        resultValues[seq].forEach((e, i) => assert_equals(value[i], e))
        value.forEach(e => valueCounts[e] = ~~valueCounts[e] + 1)
        seqCounts[seq] = ~~seqCounts[seq] + 1
        receivedSeqMax = Math.max(receivedSeqMax, seq)
    }
    abs[i].onSkip = function(to, from) {
        trace('skip', i + " skip " + from + ":" + to)
        assert(from <= to && to + HISTORY_SEQS <= receivedSeqMax)
        assert_equals(++receivedSeqs[i], from)
        receivedSeqs[i] = to
    }
    if (AUTO_START) abs[i].start()
}

global.closeEnv = function() {
    for (var i = 0; i < N; i++) {
        abs[i].close()
    }
}

var x = 0

global.resetDrainLoop = function() {
    x = 0
}

global.initDrainLoop = function(i, stop) {
    var ab = abs[i]
    ab.onDrain = function() {
        while (true) {
            if (x >= 26) {
                if (stop) return
                x = 0
            }
            if (!ab.broadcast({
                    tag: String.fromCharCode(0x41 + (x++))
                })) break
        }
    }
    ab.onDrain()
}

global.initSerialLoop = function(i, stop) {
    var ab = abs[i]
    var oldOnReceive = ab.onReceive
    ab.onReceive = function(value, seq) {
        oldOnReceive(value, seq)
        doRequest()
    }

    function doRequest() {
        if (x >= 26) {
            if (stop) return
            x = 0
        }
        ab.broadcast({
            tag: String.fromCharCode(0x41 + (x++))
        })
    }
    doRequest()
}

global.totalValueCounts = function() {
    var c = 0
    for (var v in valueCounts) {
        c += valueCounts[v]
    }
    return c
}

global.IPC = class {
    constructor(from) {
        this.from = from
        this.connected = {}
        this.closed = true
    }

    start() {
        if (!this.closed) return
        this.closed = false
        trace('ipc', "IPC start " + this.from)
        var from = this.from
        ipcs[from] = this
        var fromIPC = this
        for (let to in ipcs) {
            if (from == to) continue
            let toIPC = ipcs[to]
            if (!toIPC) continue
            internal_schedule(function() {
                if (ipcs[from] !== fromIPC) return
                if (ipcs[to] !== toIPC) return
                trace('ipc', "IPC connecting " + from + " to " + to)
                toIPC.connected[from] = fromIPC
                fromIPC.connected[to] = toIPC
                toIPC.onConnected(from)
                fromIPC.onConnected(to)
            }, from, to)
        }
    }

    close() {
        if (this.closed) return
        this.closed = true
        trace('ipc', "IPC close " + this.from)
        ipcs[this.from] = null
        this.connected = {}
    }

    send(pkt, to) {
        var from = this.from
        assert(from != to)
        var fromIPC = this
        var toIPC = ipcs[to]
        if (!toIPC || toIPC.connected[from] != fromIPC) return false
        if (ipcs[from] !== fromIPC || fromIPC.connected[to] != toIPC) return false
        internal_schedule(function() {
            if (ipcs[to] !== toIPC || toIPC.connected[from] != fromIPC) return
            if (ipcs[from] !== fromIPC || fromIPC.connected[to] != toIPC) return
            if (pkt.type == 'vote') {
                trace('ipc', "send vote " + from + " to " + to + " seq=" + pkt.seq + " r=" + pkt.round +
                    " weak=" + pkt.weak + " value=" + pkt.value.map(e => e.tag))
            } else if (pkt.type == 'update') {
                trace('ipc', "send update " + from + " to " + to +
                    " cbkSeq=" + pkt.cbkSeq + " minSeq=" + pkt.minSeq + " maxSeq=" + pkt.maxSeq)
            } else if (pkt.type == 'limit') {
                trace('ipc', "send limit " + from + " to " + to +
                    " limSeq=" + pkt.limSeq + " limReq=" + pkt.limReq)
            }
            toIPC.onReceive(pkt, from)
        }, from, to)
        return true
    }

    onConnected(to) {}
    onDrain(to) {}
    onReceive(pkt, from) {}
}

global.VLog = class {
    constructor(name) {
        this.writing = 0
        this.lazyLimSeq = {}
        if (name instanceof VLog) {
            assert(name.closed)
            this.name = name.name
            this.votes = name.votes
            this.minSeq = name.minSeq
            this.baseSeq = name.baseSeq
            this.storedLimSeq = name.storedLimSeq
            return
        }
        assert_equals(typeof name, "string")
        this.name = name
        this.votes = []
        this.minSeq = 0
        this.baseSeq = 0
        this.storedLimSeq = {}
    }

    start() {
        if (this.broken) {
            this.brokenStart()
            return
        }
        assert_equals(this.closed, undefined)
        this.closed = false
        var name = this.name
        var loop
        var i = -1
        internal_schedule(loop = function() {
            if (this.closed) return
            if (i < 0) {
                i++;
                trace('vlog', name + " vlog start minSeq=" + this.minSeq + " baseSeq=" + this.baseSeq)
                internal_schedule(loop, name, name)
                return this.onStart(this.minSeq, this.baseSeq)
            }
            while (i < this.votes.length) {
                var vote = this.votes[i++]
                if (vote.seq < this.minSeq) continue
                trace('vlog', name + " read vote.seq=" + vote.seq + " vote.round=" + vote.round)
                internal_schedule(loop, name, name)
                return this.onRead(vote)
            }
            trace('vlog', name + " vlog recovered")
            this.recovered = true
            return this.onRecovered()
        }.bind(this), name, name)
    }

    brokenStart() {
        assert_equals(this.closed, undefined)
        this.closed = false
        var name = this.name
        internal_schedule(function() {
            if (this.closed) return
            trace('vlog', name + " vlog broken start")
            return this.onBrokenStart()
        }.bind(this), name, name)
    }

    initialize(minSeq) {
        assert(this.broken)
        this.broken = false
        this.votes = []
        this.minSeq = minSeq
        this.baseSeq = minSeq
        this.storedLimSeq = {}
        var name = this.name
        var loop
        var i = -1
        internal_schedule(loop = function() {
            if (this.closed) return
            if (i < 0) {
                i++;
                trace('vlog', name + " vlog clean start minSeq=" + this.minSeq)
                internal_schedule(loop, name, name)
                return this.onStart(this.minSeq, this.baseSeq)
            }
            trace('vlog', name + " vlog clean recovered")
            this.recovered = true
            return this.onRecovered()
        }.bind(this), name, name)
    }

    close() {
        assert(!this.closed)
        this.closed = true
    }

    isWritable() {
        assert(!this.broken)
        assert(this.recovered)
        return !this.writing
    }

    write(vote) {
        assert(!this.broken)
        assert(this.recovered)
        this.writing++;
        var lazyLimSeq = obj_copy(this.lazyLimSeq)
        internal_schedule(function() {
            this.writing--;
            if (this.closed) return
            this.votes.push(vote)
            trace('vlog', this.name + " write vote.seq=" + vote.seq + " vote.round=" + vote.round)
            this.onVoteWritten(vote)
            for (var i in lazyLimSeq) {
                if (this.storedLimSeq[i] < lazyLimSeq[i]) {
                    this.storedLimSeq[i] = lazyLimSeq[i]
                    trace('vlog', this.name + " lazy limSeq remote=" + i + " seq=" + lazyLimSeq[i])
                    this.onLimSeqStored(i)
                }
            }
        }.bind(this), this.name, this.name)
    }

    updateMinSeq(minSeq) {
        if (this.broken) return
        if (this.minSeq >= minSeq) return
        this.minSeq = minSeq
    }

    updateLimSeq(i, seq) {
        if (this.broken) return
        if (!this.recovered) return
        if (seq <= this.storedLimSeq[i]) return
        internal_schedule(function() {
            if (this.closed) return
            if (!this.storedLimSeq[i] || this.storedLimSeq[i] < seq) {
                this.storedLimSeq[i] = seq
                trace('vlog', this.name + " update limSeq remote=" + i + " seq=" + seq)
                this.onLimSeqStored(i)
            }
        }.bind(this), this.name, this.name)
    }

    lazyUpdateLimSeq(i, seq) {
        if (this.broken) return
        if (!this.recovered) return
        if (!this.lazyLimSeq[i] || this.lazyLimSeq[i] < seq) {
            this.lazyLimSeq[i] = seq
        }
    }

    getStoredLimSeq(i) {
        assert(!this.broken)
        assert(this.recovered)
        return this.storedLimSeq[i]
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

global.ctx = new PromiseContext()

ctx.setCompletion(test_success, function(err) {
    console.log(err)
})

global.waitUntil = function(cond) {
    var loop = 10000
    ctx.loop(function() {
        assert(--loop >= 0, "TIMEOUT in waitUntil()")
        if (cond()) ctx.break()
        ctx.sleep(1)
    })
}

setImmediate = hooked_setImmediate
var internal_schedule = hooked_setImmediate
global.sim_ipc_delays = []
global.sim_vlog_delays = []
global.sim_node_delays = []

function sim_schedule(func, from, to) {
    var delay = 0
    if (from == to) {
        delay += ~~sim_vlog_delays[from]
        delay += ~~sim_node_delays[from]
    } else {
        delay += ~~sim_ipc_delays[from]
        delay += ~~sim_ipc_delays[to]
        delay += ~~sim_node_delays[from]
        delay += ~~sim_node_delays[to]
    }
    delay = Math.floor(delay * (0.85 + Math.random() * 0.3))
    sim_setTimeout(func, delay)
}

global.setSimTests = function(onoff, ipc_delays, vlog_delays, node_delays) {
    ctx.call(function() {
        if (!onoff) {
            setImmediate = hooked_setImmediate
            internal_schedule = hooked_setImmediate
        } else {
            sim_clock = 0
            setImmediate = sim_setImmediate
            internal_schedule = sim_schedule
            sim_ipc_delays = ipc_delays || []
            sim_vlog_delays = vlog_delays || []
            sim_node_delays = node_delays || []
        }
    })
}

global.simTests = function(test) {
    ctx.call(function() {
        setSimTests(false)
        ctx.call(test)
        setSimTests(true, [50, 50, 50, 50, 50, 50, 50], [5, 5, 5, 5, 5, 5, 5], [])
        ctx.call(test)
        setSimTests(true, [5, 5, 5, 5, 5, 5, 5], [50, 50, 50, 50, 50, 50, 50], [])
        ctx.call(test)
        setSimTests(true, [5, 5, 5, 5, 5, 5, 5], [5, 5, 5, 5, 5, 5, 5], [10, 20, 30, 70, 30, 20, 10])
        ctx.call(test)
    })
}

global.nodeTests = function(test) {
    for (let n = 3; n < 8; n++) {
        for (let f = 1; f * 2 < n; f++) {
            if (n > 5 && (f + 1) * 2 < n) continue
            ctx.call(function() {
                N = n
                F = f
                M = N - F
                test()
            })
        }
    }
}

global.envTests = function(test, loop) {
    ctx.loop(function() {
        if (--loop < 0) ctx.break()
        BUFFER_QUEUE = randomInt(4) + 1
        BUFFER_SEQS = randomInt(4) + 1
        HISTORY_SEQS = randomInt(8) + 1
        MERGE_ROUNDS = randomInt(4)
        fixedEnvTest(test)
    })
}

global.fixedEnvTest = function(test) {
    ctx.call(initEnv)
    ctx.call(test)
    ctx.call(dump)
    ctx.call(closeEnv)
    waitUntil(() => (setImmediatesAreScheduled === 0))
}
