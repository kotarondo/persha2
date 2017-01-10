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

class ConsensusState {

    /**
     * @constructor
     * @param {object} config - configuration constants
     * @param {integer} config.N - total number of nodes
     * @param {integer} config.F - acceptable number of failure nodes
     * @param {integer} config.MERGE_ROUNDS - optimizing parameter
     * @param {integer} config.COLLAPSE_ROUNDS - optimizing parameter
     * @param {any} seq - the identifier inserted into votes
     */
    constructor(config, seq) {
        assert(config.F * 2 < config.N)
        this.config = config
        this.agreed = false
        this.written = -1
        this.recovered = -1
        this.seq = seq
        this.round = 0
        updateRound(this, 1)
    }

    /**
     * initial setting of write optimization in case of first time execution
     */
    setWritten() {
        updateWritten(this, 0)
    }

    /**
     * initial setting of write optimization in case of possibly recovered execution
     */
    setRecovered() {
        updateRecovered(this, 0)
    }

    /**
     * input a vote to be recovered from previous execution
     * multiple votes can be recovered by calling this method repeatedly
     * @param {object} vote
     */
    recovery(vote) {
        assert(vote.value instanceof Array)
        updateRecovered(this, vote.round)
        if (this.agreed) return
        if (vote.agreed) {
            setAgreed(this, vote.value)
        } else {
            var round = Number(vote.round)
            var weak = Boolean(vote.weak)
            if (!(this.round <= round)) return
            updateRound(this, round)
            setVote0(this, vote.value, weak)
        }
        setCommitted(this)
    }

    /**
     * input initial candidate texts of this consensus
     * @param {array} value - array of initial candidate objects
     * @return {boolean} - internal own state is changed or not 
     */
    init(value) {
        assert(value instanceof Array)
        if (this.round !== 1) return false
        if (this.vote) return false
        assert(!this.agreed)
        value = value.concat().sort(compareTag)
        setVote(this, value, false)
        while (step(this));
        return true
    }

    /**
     * get agreed value
     * @return {array} - array of agreed objects; order of the array is also agreed
     * null is returned when it is not agreed yet
     */
    getValue() {
        if (!this.agreed) return null
        if (!this.committed) return null
        var value = this.vote.value
        assert(value instanceof Array)
        return value
    }

    /**
     * pop a vote required to be written in external vote log
     * voteWritten() must be called after the pop-ed vote is written
     * @return {object} - vote
     * null is returned when there is no need to write any vote
     */
    popVoteToWrite() {
        if (!this.vote) return null
        if (this.committed || this.writing) return null
        this.writing = this.vote
        return this.vote
    }

    /**
     * notify that a previously pop-ed vote is written
     * @param {object} vote - vote
     * @return {boolean} - internal own state is changed or not 
     */
    voteWritten(vote) {
        updateWritten(this, vote.round)
        if (this.writing !== vote) return false
        this.writing = null
        return setCommitted(this)
    }

    /**
     * pop a vote required to be sent to the specified node
     * @param {string} to - other node name
     * @return {object} - vote
     * null is returned when there is no need to send any vote
     */
    popVoteToSend(to) {
        if (!this.sendable) return null
        if (this.sent[to]) return null
        this.sent[to] = true
        return this.sendable
    }

    /**
     * notify that previously pop-ed votes are possibly lost
     * @param {string} to - other node name
     */
    resetVoteToSend(to) {
        if (!this.sendable) return
        delete this.sent[to]
    }

    /**
     * receive a vote from other node
     * @param {object} vote - vote
     * @param {string} from - other node name
     * @return {boolean} - internal own state is changed or not 
     */
    receiveFrom(vote, from) {
        from = String(from)
        assert(from)
        return receive(this, vote, from)
    }

}

function updateWritten(cs, round) {
    if (cs.written < round) cs.written = round
}

function updateRecovered(cs, round) {
    if (cs.recovered < round) cs.recovered = round
    updateWritten(cs, round)
}

function updateRound(cs, round) {
    assert(!cs.agreed)
    if (!(cs.round < round)) return
    cs.round = round
    cs.count = 0
    cs.countW = 0
    cs.received = {}
    cs.vote = null
    cs.committed = true
}

function setCommitted(cs) {
    if (cs.committed) return false
    cs.committed = true
    cs.sendable = cs.vote
    cs.sent = {}
    return true
}

function setVote0(cs, value, weak) {
    assert(!cs.agreed)
    assert(!cs.vote)
    cs.count++;
    if (weak) cs.countW++;
    cs.vote = {
        type: 'vote',
        seq: cs.seq,
        round: cs.round,
        value: value,
        weak: weak,
    }
    cs.writing = null
    cs.committed = false
}

function setVote(cs, value, weak) {
    if (0 <= cs.recovered && cs.round <= cs.recovered + cs.config.COLLAPSE_ROUNDS) {
        weak = true
    }
    setVote0(cs, value, weak)
    if (0 <= cs.written && cs.round <= cs.written + cs.config.COLLAPSE_ROUNDS) {
        if (weak || (cs.round & 1)) {
            setCommitted(cs)
        }
    }
}

/*
cs.committed and cs.writing are unchanged in setAgreed():
 We don't have to keep a journal of the agreement. But, if there is an un-written vote, we have to postpone the final decision until that vote is written. When journaling of that vote have not started yet, we can omit journaling of that vote and write a journal of the agreement instead.
*/
function setAgreed(cs, value) {
    if (cs.agreed) return
    cs.vote = {
        type: 'vote',
        seq: cs.seq,
        agreed: true,
        value: value,
    }
    if (cs.committed) {
        cs.sendable = cs.vote
        cs.sent = {}
    }
    cs.agreed = true
    delete cs.count
    delete cs.countW
    delete cs.received
}

function receive(cs, vote, from) {
    assert(vote.value instanceof Array)
    assert(from)
    if (vote.agreed) {
        if (cs.agreed && cs.committed) return false
        setAgreed(cs, vote.value)
        setCommitted(cs)
        return true
    }
    if (cs.agreed) return false
    var round = Number(vote.round)
    var weak = Boolean(vote.weak)
    if (!(cs.round <= round)) return false
    updateRound(cs, round)
    if (cs.received[from]) return false
    cs.count++;
    if (weak) cs.countW++;
    cs.received[from] = vote
    if (!cs.vote) {
        // copying vote
        if (cs.round & 1) weak = false
        setVote(cs, vote.value, weak)
        step(cs)
        return true
    }
    return step(cs)
}

function step(cs) {
    if (cs.agreed) return false
    assert(cs.vote)
    if (cs.round & 1) {
        var value = findMoreThan(cs, cs.config.N / 2)
        if (value) {
            updateRound(cs, cs.round + 1)
            setVote(cs, value, false)
            return true
        }
        if (cs.count < cs.config.N - cs.config.F) return false
        var value = randomChoice(cs)
        updateRound(cs, cs.round + 1)
        setVote(cs, value, true)
        return true
    } else {
        var value = findMoreThan(cs, cs.config.F)
        if (value) {
            setAgreed(cs, value)
            return true
        }
        if (cs.count < cs.config.N - cs.config.F) return false
        var value = findMoreThan(cs, 0)
        if (!value) {
            var value = randomChoice(cs)
        }
        updateRound(cs, cs.round + 1)
        setVote(cs, value, false)
        return true
    }
}

function collectValues(cs, nw) {
    var values = []
    var vote = cs.vote
    if (!nw || !vote.weak) {
        values.push(vote.value)
    }
    for (var from in cs.received) {
        var vote = cs.received[from]
        if (!nw || !vote.weak) {
            values.push(vote.value)
        }
    }
    return values
}

function findMoreThan(cs, M) {
    if (cs.count - cs.countW <= M) return
    var values = collectValues(cs, true)
    var remains = values.length
    for (var i = 0; remains > M; i++) {
        assert(i < values.length)
        var v = values[i]
        if (!v) continue
        remains--;
        var matched = 1
        if (matched > M) return v
        var tocomp = remains
        for (var j = i + 1; matched + tocomp > M; j++) {
            assert(j < values.length)
            var w = values[j]
            if (!w) continue
            if (equalValue(v, w)) {
                values[j] = null
                remains--;
                matched++;
                if (matched > M) return v
            }
            tocomp--;
        }
    }
}

function equalValue(v, w) {
    if (v === w) return true
    assert(v instanceof Array)
    assert(w instanceof Array)
    if (v.length !== w.length) return false
    for (var i = 0; i < v.length; i++) {
        if (compareTag(v[i], w[i])) return false
    }
    return true
}

function randomChoice(cs) {
    var values = collectValues(cs)
    if (cs.round <= cs.config.MERGE_ROUNDS) {
        // merge all
        values = Array.prototype.concat.apply([], values)
        values.sort(compareTag)
        return values.filter((e, i, a) => i === 0 || compareTag(e, a[i - 1]))
    }
    var i = Math.floor(Math.random() * values.length)
    return values[i]
}

function compareTag(x, y) {
    if (x === y) return 0
    var a = x.tag
    var b = y.tag
    assert(a != null)
    assert(b != null)
    if (a === b) return 0
    if (a < b) return -1
    return 1
}

function assert(condition) {
    if (!condition) {
        var err = new Error("FATAL: assert failed in ConsensusState")
        debugger
        throw err
    }
}

module.exports = ConsensusState
