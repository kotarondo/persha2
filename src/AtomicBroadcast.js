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

'use strict'

const ConsensusState = require('./ConsensusState')

class AtomicBroadcast {

    /**
     * @constructor
     * @param {object} config - configuration constants
     * @param {integer} config.N - total number of nodes
     * @param {integer} config.F - acceptable number of failure nodes
     * @param {integer} config.M - minimum number of receiving nodes
     * @param {integer} config.MERGE_ROUNDS - optimizing parameter
     * @param {integer} config.COLLAPSE_ROUNDS - optimizing parameter
     * @param {integer} config.COLLAPSE_SEQS - optimizing parameter
     * @param {integer} config.BUFFER_QUEUE - sending buffer queue length
     * @param {integer} config.BUFFER_SEQS - sequences ahead of receiving position
     * @param {integer} config.HISTORY_SEQS - sequences behind receiving position
     * @param {object} ipc
     * @param {object} vlog
     */
    constructor(config, ipc, vlog) {
        assert(config.M <= config.N - config.F)
        assert(config.M * 2 > config.N)
        assert(1 <= config.BUFFER_QUEUE)
        assert(1 <= config.BUFFER_SEQS)
        assert(1 <= config.HISTORY_SEQS)
        this.config = config
        this.ipc = ipc
        this.vlog = vlog
        this.states = []
        this.statesBase = 0
        this.queue = []
        this.paused = false
        this.maxSeq = 0
        this.minSeq = 0
        this.iniSeq = 0
        this.cbkSeq = 0
        this.updateSent = {}
        this.cbkReceived = {}
        this.ipcSendable = {}
        this.activeReceived = {}
        this.active = false
        this.closed = false
        ipc.onConnected = ipcOnConnected.bind(null, this)
        ipc.onDrain = ipcOnDrain.bind(null, this)
        ipc.onReceive = ipcOnReceive.bind(null, this)
        vlog.onVoteWritten = vlogOnVoteWritten.bind(null, this)
        vlog.onStart = vlogOnStart.bind(null, this)
        vlog.onRead = vlogOnRead.bind(null, this)
        vlog.onRecovered = vlogOnRecovered.bind(null, this)
    }

    /**
     * start working
     */
    start() {
        if (this.closed) return
        this.vlog.start()
        this.ipc.start()
    }

    /**
     * stop working
     */
    close() {
        if (this.closed) return
        this.closed = true
        this.vlog.close()
        this.ipc.close()
    }

    /**
     * queue a message to broadcast
     * @param {object} message - tagged object
     * @return {boolean} - more messages appropriate to be queued without onDrain()
     */
    broadcast(message) {
        if (this.closed) return
        if (this.queue.every(m => message.tag !== m.tag)) {
            this.queue.push(message)
            scheduleBroadcast(this)
        }
        if (this.queue.length < this.config.BUFFER_QUEUE) return true
        this.onDrainRequired = true
        return false
    }

    /**
     * stop receiving messages
     */
    pause() {
        this.paused = true
    }

    /**
     * resume receiving messages
     */
    resume() {
        this.paused = false
        if (this.closed) return
        scheduleOnSkip(this)
        scheduleOnReceive(this)
    }

    /**
     * callback method: called when broadcast() becomes ready and it returned false previously
     */
    onDrain() {}

    /**
     * callback method: called when messages are arrived (unless this instance has been paused)
     * @param {array} value - array of received messages
     * @param {integer} seq - increasing sequence number identifying this callback
     */
    onReceive(value, seq) {}

    /**
     * callback method: called when messages have been skipped on this instance
     * @param {integer} toSeq - end of the interval of skipped sequence numbers
     * @param {integer} fromSeq - start of the interval of skipped sequence numbers
     */
    onSkip(toSeq, fromSeq) {}
}

function getState(ab, seq) {
    if (seq < ab.minSeq) return null
    var i = seq - ab.statesBase
    assert(i >= 0)
    var cs = ab.states[i]
    if (!cs) {
        var cs = ab.states[i] = new ConsensusState(ab.config, seq)
    }
    return cs
}

function scheduleBroadcast(ab) {
    if (!ab.active) return
    if (ab.broadcastScheduled) return
    if (ab.iniDone) return
    if (ab.maxSeq < ab.iniSeq) return
    if (ab.queue.length === 0) return
    setImmediate(initBroadcast, ab)
    ab.broadcastScheduled = true
}

function initBroadcast(ab) {
    assert(ab.active)
    ab.broadcastScheduled = false
    if (ab.closed) return
    if (ab.iniDone) return
    if (ab.maxSeq < ab.iniSeq) return
    if (ab.queue.length === 0) return
    var cs = getState(ab, ab.iniSeq)
    if (cs.init(ab.queue)) {
        handleVote(ab, cs)
    }
    ab.iniDone = true
}

function updateIniSeq(ab) {
    if (!ab.active) return
    if (ab.iniSeq < ab.minSeq) {
        ab.iniSeq = ab.minSeq
        ab.iniDone = false
    }
    while (true) {
        var cs = getState(ab, ab.iniSeq)
        var value = cs.getValue()
        if (!value) break
        ab.iniSeq++;
        ab.iniDone = false
        ab.queue = ab.queue.filter(e => value.every(m => e.tag !== m.tag))
        scheduleOnDrain(ab)
    }
    scheduleBroadcast(ab)
}

function scheduleOnDrain(ab) {
    if (!ab.active) return
    if (ab.onDrainScheduled) return
    if (!ab.onDrainRequired) return
    if (ab.queue.length >= ab.config.BUFFER_QUEUE) return
    setImmediate(doCallbackOnDrain, ab)
    ab.onDrainScheduled = true
}

function doCallbackOnDrain(ab) {
    assert(ab.active)
    ab.onDrainScheduled = false
    if (ab.closed) return
    if (!ab.onDrainRequired) return
    if (ab.queue.length >= ab.config.BUFFER_QUEUE) return
    ab.onDrainRequired = false
    return ab.onDrain()
}

function scheduleOnSkip(ab) {
    if (!ab.active) return
    if (ab.onSkipScheduled) return
    if (ab.paused) return
    if (ab.cbkSeq >= ab.minSeq) return
    setImmediate(doCallbackOnSkip, ab)
    ab.onSkipScheduled = true
}

function doCallbackOnSkip(ab) {
    assert(ab.active)
    ab.onSkipScheduled = false
    if (ab.closed) return
    if (ab.paused) return
    if (ab.cbkSeq >= ab.minSeq) return
    var fromSeq = ab.cbkSeq
    ab.cbkSeq = ab.minSeq
    calcSeqs(ab)
    sendUpdates(ab)
    scheduleOnReceive(ab)
    return ab.onSkip(ab.cbkSeq - 1, fromSeq)
}

function scheduleOnReceive(ab) {
    if (!ab.active) return
    if (ab.onReceiveScheduled) return
    if (ab.paused) return
    if (ab.cbkSeq < ab.minSeq) return
    if (!getState(ab, ab.cbkSeq).getValue()) return
    setImmediate(doCallbackOnReceive, ab)
    ab.onReceiveScheduled = true
}

function doCallbackOnReceive(ab) {
    assert(ab.active)
    ab.onReceiveScheduled = false
    if (ab.closed) return
    if (ab.paused) return
    if (ab.cbkSeq < ab.minSeq) return
    var seq = ab.cbkSeq
    var value = getState(ab, seq).getValue()
    if (!value) return
    ab.cbkSeq++;
    calcSeqs(ab)
    sendUpdates(ab)
    scheduleOnReceive(ab)
    assert(value.length > 0)
    return ab.onReceive(value, seq)
}

function sendVote(ab, cs, to) {
    if (!ab.active || !ab.activeReceived[to]) return
    if (!ab.ipcSendable[to]) return
    var vote = cs.popVoteToSend(to)
    if (!vote) return
    ab.ipcSendable[to] = ab.ipc.send(vote, to)
}

function sendUpdate(ab, to) {
    if (!ab.ipcSendable[to]) return
    if (ab.updateSent[to]) return
    ab.updateSent[to] = true
    ab.ipcSendable[to] = ab.ipc.send({
        type: 'update',
        cbkSeq: ab.cbkSeq,
        maxSeq: ab.maxSeq,
        minSeq: ab.minSeq,
    }, to)
}

function sendUpdates(ab) {
    ab.updateSent = {}
    for (var to in ab.ipcSendable) {
        sendUpdate(ab, to)
    }
}

function sendActive(ab, to) {
    if (!ab.active) return
    ab.ipc.send({
        type: 'active',
    }, to)
}

function ipcOnConnected(ab, to) {
    assert(!ab.closed)
    ab.updateSent[to] = false
    ab.activeReceived[to] = false
    for (var i in ab.states) {
        var cs = ab.states[i]
        if (cs.seq < ab.minSeq) continue
        cs.resetVoteToSend(to)
    }
    sendActive(ab, to)
    ipcOnDrain(ab, to)
}

function ipcOnDrain(ab, to) {
    assert(!ab.closed)
    ab.ipcSendable[to] = true
    sendUpdate(ab, to)
    if (!ab.active || !ab.activeReceived[to]) return
    for (var i in ab.states) {
        var cs = ab.states[i]
        if (cs.seq < ab.minSeq) continue
        sendVote(ab, cs, to)
    }
}

function ipcOnReceive(ab, pkt, from) {
    assert(!ab.closed)
    switch (pkt.type) {
        case 'vote':
            assert(ab.active)
            if (pkt.seq < ab.minSeq) return
            var cs = getState(ab, pkt.seq)
            if (cs.receiveFrom(pkt, from)) {
                handleVote(ab, cs)
            }
            break
        case 'update':
            var oldMinSeq = ab.minSeq
            var oldMaxSeq = ab.maxSeq
            updateMinSeq(ab, pkt.minSeq)
            updateMaxSeq(ab, pkt.maxSeq)
            if (!ab.cbkReceived[from] || ab.cbkReceived[from] < pkt.cbkSeq) {
                ab.cbkReceived[from] = pkt.cbkSeq
                calcSeqs(ab)
            }
            if (!(oldMinSeq === ab.minSeq && oldMaxSeq === ab.maxSeq)) {
                sendUpdates(ab)
            }
            break
        case 'active':
            ab.activeReceived[from] = true
            if (ab.ipcSendable[from]) {
                ipcOnDrain(ab, from)
            }
            break
    }
}

function calcSeqs(ab) {
    var seqs = []
    seqs.push(ab.cbkSeq)
    for (var from in ab.cbkReceived) {
        seqs.push(ab.cbkReceived[from])
    }
    if (seqs.length < ab.config.M) return
    seqs.sort((x, y) => y - x)
    var seq = seqs[ab.config.M - 1]
    updateMinSeq(ab, seq - ab.config.HISTORY_SEQS)
    updateMaxSeq(ab, seq + ab.config.BUFFER_SEQS - 1)
}

function updateMinSeq(ab, seq) {
    if (!(ab.minSeq < seq)) return
    ab.minSeq = seq
    var i = ab.minSeq - ab.statesBase
    if (100 < i) {
        ab.states = ab.states.slice(i)
        ab.statesBase = ab.minSeq
    }
    ab.vlog.updateMinSeq(ab.minSeq)
    updateIniSeq(ab)
    scheduleOnSkip(ab)
}

function updateMaxSeq(ab, seq) {
    if (!(ab.maxSeq < seq)) return
    ab.maxSeq = seq
    scheduleBroadcast(ab)
}

function handleVote(ab, cs) {
    assert(ab.active)
    if (cs.getValue()) {
        if (cs.seq === ab.iniSeq) updateIniSeq(ab)
        if (cs.seq === ab.cbkSeq) scheduleOnReceive(ab)
    }
    for (var to in ab.ipcSendable) {
        sendVote(ab, cs, to)
    }
    writeVote(ab, cs)
}

function writeVote(ab, cs) {
    var vote = cs.popVoteToWrite()
    if (!vote) return
    if (!ab.vlog.isWritable()) {
        ab.writeVotePending = true
        cs.cancelVoteToWrite(vote)
        return
    }
    ab.vlog.write(vote)
}

function writeVoteAll(ab) {
    for (var i in ab.states) {
        var cs = ab.states[i]
        if (cs.seq < ab.minSeq) continue
        writeVote(ab, cs)
    }
}

function vlogOnVoteWritten(ab, vote) {
    var seq = vote.seq
    for (var i = 1; i <= ab.config.COLLAPSE_SEQS; i++) {
        var cs2 = getState(ab, seq + i)
        if (cs2) cs2.setWritten()
    }
    var cs = getState(ab, seq)
    if (cs && cs.voteWritten(vote)) {
        handleVote(ab, cs)
    }
    if (ab.writeVotePending && ab.vlog.isWritable()) {
        ab.writeVotePending = false
        writeVoteAll(ab)
    }
}

function vlogOnStart(ab, minSeq) {
    assert(!ab.active)
    assert(!ab.closed)
    if (minSeq === 0) return
    updateMinSeq(ab, minSeq)
    for (var i = 1; i <= ab.config.COLLAPSE_SEQS; i++) {
        var cs2 = getState(ab, minSeq - 1 + i)
        if (cs2) cs2.setRecovered()
    }
}

function vlogOnRead(ab, vote) {
    // recovery
    assert(!ab.active)
    assert(!ab.closed)
    var cs = getState(ab, vote.seq)
    if (cs) cs.recovery(vote)
    for (var i = 1; i <= ab.config.COLLAPSE_SEQS; i++) {
        var cs2 = getState(ab, cs.seq + i)
        if (cs2) cs2.setRecovered()
    }
}

function vlogOnRecovered(ab) {
    assert(!ab.active)
    assert(!ab.closed)
    ab.active = true
    for (var to in ab.ipcSendable) {
        sendActive(ab, to)
    }
    for (var i in ab.states) {
        var cs = ab.states[i]
        if (cs.seq < ab.minSeq) continue
        handleVote(ab, cs)
    }
    updateIniSeq(ab)
    scheduleOnDrain(ab)
    scheduleOnSkip(ab)
    scheduleOnReceive(ab)
}

function assert(condition) {
    if (!condition) {
        var err = new Error("FATAL: assert failed in AtomicBroadcast")
        debugger
        throw err
    }
}

module.exports = AtomicBroadcast
