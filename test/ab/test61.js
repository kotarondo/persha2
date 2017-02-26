// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

'use strict'

// cyclic broken restart

require('./harness')

function test() {
    if (F <= 1) return
    for (var i = 0; i < N; i++) {
        initDrainLoop(i)
    }
    waitUntil(() => seqCounts[5] === N)
    var dead = randomInt(N)
    ctx.call(function() {
        abs[dead].close()
    })
    var i = 0
    ctx.loop(function() {
        if (i !== dead) {
            restartEnv(i, 'broken')
            initDrainLoop(i)
            waitUntil(() => seqCounts[i * 20] > 0)
        }
        if (++i >= N) ctx.break()
    })
    ctx.call(function() {
        restartEnv(dead, 'broken')
        initDrainLoop(dead)
    })
    waitUntil(() => seqCounts[i * 20 + 20] === N)
}

// trace_flag.push('all')
// debug_flag = true

simTests(function() {
    nodeTests(function() {
        envTests(test, 1)
    })
})

ctx.end()
