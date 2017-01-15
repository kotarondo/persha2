// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

'use strict'

// node slow down

require('./harness')

function test() {
    for (var i = 0; i < N; i++) {
        initDrainLoop(i)
    }
    var seq = 0
    var limit = 10
    ctx.loop(function() {
        seq++;
        for (var i = 0; i < N; i++) {
            sim_node_delays[i] = (Math.random() < 0.3) ? 300 : 0
        }
        trace('test', "sim_node_delays=" + sim_node_delays)
        waitUntil(() => seqCounts[seq * 8] > 0)
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
