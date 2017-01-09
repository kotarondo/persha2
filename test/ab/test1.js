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
        abs[i].broadcast({
            tag: String.fromCharCode(0x41 + i)
        })
        abs[i].start()
    }
    var loop = 1000
    ctx.loop(function() {
        assert(--loop >= 0)
        var fin = 0
        for (var v in valueCounts) {
            if (valueCounts[v] === N) fin++;
        }
        if (fin === N) ctx.break()
        ctx.sleep(1)
    })
}

// debug_flag = true
envTests(test, 100)

ctx.call(test_success)
