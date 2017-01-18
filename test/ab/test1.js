// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

'use strict'

// access before start()

require('./harness')

N = 3
F = 1
M = 2
AUTO_START = false

function test() {
    for (var i = 0; i < N; i++) {
        var ab = abs[i]
        ab.broadcast({
            tag: String.fromCharCode(0x41 + i)
        })
        assert_equals(ab.vlog.closed, undefined)
        ab.start()
    }
    waitUntil(() => (setImmediatesAreScheduled === 0))
    ctx.call(function() {
        for (var i = 0; i < N; i++) {
            var v = String.fromCharCode(0x41 + i)
            assert_equals(valueCounts[v], N)
        }
        seqCounts.forEach(e => assert_equals(e, N))
    })
}

// trace_flag.push('all')
// debug_flag = true

simTests(function() {
    envTests(test, 100)
})

ctx.end()
