'use strict'

// immediate broken restart

require('./harness')

function test() {
    for (var i = 0; i < N; i++) {
        initDrainLoop(i)
    }
    waitUntil(() => seqCounts[5] === N)
    ctx.call(function() {
        var c = randomInt(F - 1) + 1
        while (c--) {
            var i = randomInt(N)
            restartEnv(i, 'broken')
            initDrainLoop(i)
        }
    })
    waitUntil(() => seqCounts[20] === N)
    ctx.call(function() {
        var c = randomInt(F - 1) + 1
        while (c--) {
            var i = randomInt(N)
            restartEnv(i, 'broken')
            initDrainLoop(i)
        }
    })
    waitUntil(() => seqCounts[35] === N)
}

// trace_flag.push('all')
// debug_flag = true

simTests(function() {
    nodeTests(function() {
        envTests(test, 1)
    })
})

ctx.end()
