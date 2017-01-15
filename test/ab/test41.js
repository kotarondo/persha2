// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

'use strict'

// immediate multiple recovery

require('./harness')

function test() {
    for (var i = 0; i < N; i++) {
        initDrainLoop(i)
    }
    var seq = 0
    var limit = 10
    ctx.loop(function() {
        seq++;
        var c = randomInt(N - F)
        if (c === 0) limit++;
        while (c--) {
            var i = randomInt(N)
            restartEnv(i)
            initDrainLoop(i)
        }
        waitUntil(() => seqCounts[seq * 4] > 0)
        if (seq >= limit) ctx.break()
    })
}

// trace_flag.push('receive', 'skip', 'test')
// debug_flag = true

simTests(function() {
    nodeTests(function() {
        envTests(test, 1)
    })
})

ctx.end()
