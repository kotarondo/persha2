// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

'use strict'

// flow control

require('./harness')

var x

function init(i) {
    var ab = abs[i]
    ab.onDrain = function() {
        while (true) {
            if (x >= 26) return
            if (!ab.broadcast({
                    tag: String.fromCharCode(0x41 + (x++))
                })) break
        }
    }
}

function test1() {
    x = 0
    for (var i = 0; i < N; i++) {
        init(i)
    }
    abs[0].pause()
    for (var i = 0; i < N; i++) {
        abs[i].onDrain()
    }
    waitUntil(() => (setImmediatesAreScheduled === 0))
    ctx.call(function() {
        var c = 0
        for (var v in valueCounts) {
            assert_equals(valueCounts[v], N - 1)
            c++;
        }
        assert_equals(c, 26)
    })
}

function test2() {
    x = 0
    for (var i = 0; i < N; i++) {
        init(i)
    }
    abs[0].pause()
    abs[0].onDrain()
    waitUntil(() => (setImmediatesAreScheduled === 0))
    ctx.call(function() {
        var c = 0
        for (var v in valueCounts) {
            assert_equals(valueCounts[v], N - 1)
            c++;
        }
        assert_equals(c, 26)
    })
}

function test3() {
    x = 0
    for (var i = 0; i < N; i++) {
        init(i)
    }
    for (var i = 0; i < N; i++) {
        if (i >= M - 1) abs[i].pause()
        abs[i].onDrain()
    }
    waitUntil(() => (setImmediatesAreScheduled === 0))
    ctx.call(function() {
        var c = 0
        for (var v in valueCounts) {
            assert(valueCounts[v] === M - 1)
            c++;
        }
        for (var i = 0; i < N; i++) {
            if (i >= M - 1) {
                assert_equals(receivedSeqs[i], -1, receivedSeqs)
            } else {
                assert(c === 26 || receivedSeqs[i] === BUFFER_SEQS - 1, receivedSeqs)
            }
        }
        for (var i = 0; i < N; i++) {
            if (i >= M - 1) abs[i].resume()
        }
    })
    waitUntil(() => (setImmediatesAreScheduled === 0))
    ctx.call(function() {
        var c = 0
        for (var v in valueCounts) {
            assert_equals(valueCounts[v], N)
            c++;
        }
        assert_equals(c, 26)
    })
}

// trace_flag.push('receive')
// debug_flag = true

simTests(function() {
    nodeTests(function() {
        envTests(test1, 3)
        envTests(test2, 3)
        envTests(test3, 3)
    })
})

ctx.end()
