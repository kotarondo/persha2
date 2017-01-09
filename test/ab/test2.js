// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

'use strict'

// test flow control

require('./harness')

N = 3
F = 1
M = 2

function init() {
    var x = 0
    for (var i = 0; i < N; i++) {
        let ab = abs[i]
        ab.onDrain = function() {
            while (true) {
                if (x >= 26) return
                if (!ab.broadcast({
                        tag: String.fromCharCode(0x41 + (x++))
                    })) break
            }
        }
    }
}

function test1() {
    init()
    abs[0].pause()
    abs[0].onDrain()
    abs[1].onDrain()
    abs[2].onDrain()
    var loop = 1000
    ctx.loop(function() {
        assert(--loop >= 0)
        var fin = 0
        for (var v in valueCounts) {
            if (valueCounts[v] === N - 1) fin++;
        }
        if (fin === 26) ctx.break()
        ctx.sleep(1)
    })
}

function test2() {
    init()
    abs[0].pause()
    abs[0].onDrain()
    var loop = 1000
    ctx.loop(function() {
        assert(--loop >= 0)
        var fin = 0
        for (var v in valueCounts) {
            if (valueCounts[v] === N - 1) fin++;
        }
        if (fin === 26) ctx.break()
        ctx.sleep(1)
    })
}

function test3() {
    init()
    abs[0].pause()
    abs[1].pause()
    abs[0].onDrain()
    abs[1].onDrain()
    abs[2].onDrain()
    ctx.sleep(100)
    ctx.call(function() {
        var fin = 0
        for (var v in valueCounts) {
            assert(valueCounts[v] === 1)
            fin++;
        }
        assert_equals(receivedSeqs[0], -1, receivedSeqs)
        assert_equals(receivedSeqs[1], -1, receivedSeqs)
        assert(fin === 26 || receivedSeqs[2] == BUFFER_SEQS - 1, receivedSeqs)
        abs[0].resume()
        abs[1].resume()
    })
    var loop = 1000
    ctx.loop(function() {
        assert(--loop >= 0)
        var fin = 0
        for (var v in valueCounts) {
            if (valueCounts[v] === N) fin++;
        }
        if (fin === 26) ctx.break()
        ctx.sleep(1)
    })
}

// debug_flag = true
envTests(test1, 20)
envTests(test2, 20)
envTests(test3, 10)

ctx.call(test_success)
