// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

'use strict'

// immediate recovery

require('./harness')

function test1() {
    var x = 0
    ctx.loop(function() {
        var t = String.fromCharCode(0x41 + (x++))
        var i = randomInt(N)
        restartEnv(i)
        abs[i].broadcast({
            tag: t
        })
        waitUntil(() => valueCounts[t] === N)
        ctx.call(function() {
            for (var i = 0; i < x; i++) {
                var t = String.fromCharCode(0x41 + i)
                var k = Math.min(x - i - 1, HISTORY_SEQS - 1)
                assert(valueCounts[t] >= N + k, valueCounts)
            }
        })
        if (x >= 26) ctx.break()
    })
}

function test2() {
    var x = 0
    ctx.loop(function() {
        var t = String.fromCharCode(0x41 + (x++))
        var i = randomInt(N)
        restartEnv(i)
        var j = randomInt(N)
        abs[j].broadcast({
            tag: t
        })
        waitUntil(() => valueCounts[t] === N)
        ctx.call(function() {
            for (var i = 0; i < x; i++) {
                var t = String.fromCharCode(0x41 + i)
                var k = Math.min(x - i - 1, HISTORY_SEQS - 1)
                assert(valueCounts[t] >= N + k, valueCounts)
            }
        })
        if (x >= 26) ctx.break()
    })
}

// trace_flag.push('receive', 'skip', 'test')
// debug_flag = true

simTests(function() {
    nodeTests(function() {
        envTests(test1, 1)
        envTests(test2, 1)
    })
})

simTests(function() {
    N = 3
    F = 1
    M = 2
    envTests(test2, 10)
})

ctx.end()
