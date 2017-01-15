// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

'use strict'

require('../harness')
global.ConsensusState = require('../../src/ConsensusState')

global.N = 1
global.F = 0
global.SET_WRITTEN = 0
global.COLLAPSE_ROUNDS = 0
global.MERGE_ROUNDS = 0

global.states = []
global.journals = []

global.initEnv = function() {
    debug("====================")
    debug("SET_WRITTEN=" + SET_WRITTEN + " COLLAPSE_ROUNDS=" + COLLAPSE_ROUNDS + " MERGE_ROUNDS=" + MERGE_ROUNDS)
    states = []
    journals = []
    for (var i = 0; i < N; i++) {
        var config = {
            N: N,
            F: F,
            COLLAPSE_ROUNDS: COLLAPSE_ROUNDS,
            MERGE_ROUNDS: MERGE_ROUNDS,
        }
        states[i] = new ConsensusState(config)
        if (SET_WRITTEN) states[i].setWritten()
        journals[i] = null
    }
}

global.restartEnv = function(i) {
    var config = {
        N: N,
        F: F,
        COLLAPSE_ROUNDS: COLLAPSE_ROUNDS,
        MERGE_ROUNDS: MERGE_ROUNDS,
    }
    states[i] = new ConsensusState(config)
    states[i].setRecovered()
    if (journals[i]) states[i].recovery(journals[i])
    for (var j = 0; j < N; j++) {
        if (!states[j]) continue
        states[j].resetVoteToSend(i)
    }
}

global.initState = function(i, v) {
    if (v == null) return
    if (states[i] == null) return
    states[i].init([{
        tag: v
    }])
}

global.initStates = function() {
    for (var i = 0; i < N; i++) {
        initState(i, arguments[i])
    }
}

global.writeVote = function(i) {
    if (states[i] == null) return
    var vote = states[i].popVoteToWrite()
    if (!vote) return
    journals[i] = vote
    states[i].voteWritten(vote)
}

global.writeVotes = function() {
    for (var i = 0; i < N; i++) {
        writeVote(i)
    }
}

global.transferVote = function(from, to) {
    if (from == to) return
    if (states[from] == null) return
    if (states[to] == null) return
    var vote = states[from].popVoteToSend(to)
    if (!vote) return
    states[to].receiveFrom(vote, from)
}

global.checkAgreement = function() {
    var c = 0
    var agreed = null
    for (var i = 0; i < N; i++) {
        if (states[i] == null) continue
        c++;
        var v = states[i].getValue()
        if (!v) continue
        if (!agreed) agreed = v
        assert(v instanceof Array)
        assert_equals(agreed.length, v.length)
        agreed.forEach((e, i) => assert_equals(e.tag, v[i].tag))
        c--;
    }
    return (c === 0)
}

global.advanceRound = function() {
    for (var i = 0; i < N; i++) {
        writeVote(i)
    }
    var votes = []
    for (var i = 0; i < N; i++) {
        votes[i] = []
        for (var j = 0; j < N; j++) {
            if (i === j) continue
            if (states[i] == null) continue
            votes[i][j] = states[i].popVoteToSend(j)
        }
    }
    for (var i = 0; i < N; i++) {
        for (var j = 0; j < N; j++) {
            var vote = votes[i][j]
            if (!vote) continue
            if (states[j] == null) continue
            states[j].receiveFrom(vote, i)
        }
    }
}

global.finishConsensus = function() {
    for (var i = 0;; i++) {
        assert(i < 100)
        advanceRound()
        if (checkAgreement()) break
    }
}

global.dump = function() {
    if (!debug_flag) return
    var line = ''
    for (var i = 0; i < N; i++) {
        var cs = states[i] || {
            round: 0
        }
        line += ' '
        var s = ''
        if (cs.agreed) {
            s += '*'
        } else {
            s += cs.round
        }
        if (cs.committed) {
            s += ':'
        } else {
            s += '-'
        }
        if (cs.vote) {
            var value = cs.vote.value
            if (cs.vote.weak) {
                value.forEach(v => s += v.tag.toLowerCase())
            } else {
                value.forEach(v => s += v.tag.toUpperCase())
            }
        }
        s = (s + '              ').substring(0, 8)
        line += s
    }
    console.log(line)
}

global.envTests = function(test) {
    for (var s = 0; s < 2; s++) {
        for (var c = 0; c < 10; c++) {
            for (var m = 0; m < 10; m++) {
                SET_WRITTEN = s
                COLLAPSE_ROUNDS = c
                MERGE_ROUNDS = m
                initEnv()
                test()
            }
        }
    }
}

global.prefixEnvTests = function(test) {
    for (var p = 0; p < 4; p++) {
        envTests(function() {
            for (var i = 0; i < N; i++) {
                initState(i, String.fromCharCode(0x41 + i))
            }
            dump()
            for (var i = 0; i < p; i++) {
                advanceRound()
                dump()
            }
            debug("----------")
            test()
        })
    }
}

global.nodeEnvTests = function(test) {
    for (var n = 3; n < 8; n++) {
        for (var f = 1; f * 2 < n; f++) {
            N = n
            F = f
            envTests(test)
        }
    }
}

global.randomExecution = function() {
    var arr = []
    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            arr.push(function() {
                initState(i, String.fromCharCode(0x41 + i))
            })
            arr.push(function() {
                writeVote(i)
            })
            arr.push(function() {
                transferVote(i, j)
            })
        }
    }
    arr.push(function() {
        for (var i = 0; i < N; i++) {
            initState(i, String.fromCharCode(0x41 + i))
        }
    })
    shuffle(arr)
    var l = randomInt(arr.length) * 3
    for (var i = 0; i < l; i++) {
        arr[Math.floor(N / Math.random()) % arr.length]()
    }
}
