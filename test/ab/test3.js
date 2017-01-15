// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

'use strict'

// duplicate messages

require('./harness')

N = 3
F = 1
M = 2

function broadcast(x) {
    for (var i = 0; i < N; i++) {
        abs[i].broadcast({
            tag: String.fromCharCode(0x41 + x)
        })
    }
}

function test1() {
    broadcast(0)
    waitUntil(() => (setImmediatesAreScheduled === 0))
    ctx.call(function() {
        assert_equals(valueCounts.A, N, valueCounts)
    })
}

function test2() {
    var c = 0
    ctx.loop(function() {
        c++;
        for (var i = 0; i < c; i++) {
            broadcast(0)
        }
        waitUntil(() => valueCounts.A === N * c)
        if (c >= 20) ctx.break()
    })
    waitUntil(() => (setImmediatesAreScheduled === 0))
    ctx.call(function() {
        assert_equals(valueCounts.A, N * c, valueCounts)
    })
}

// trace_flag.push('receive')
// debug_flag = true

simTests(function() {
    envTests(test1, 30)
    envTests(test2, 30)
})

ctx.end()
