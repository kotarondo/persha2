// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

'use strict'

// hang up netowrk

require('./harness')

function test() {
    for (var i = 0; i < N; i++) {
        initDrainLoop(i)
    }
    var seq = 0
    var limit = 20
    ctx.loop(function() {
        seq++;
        var f = 0
        for (var i = 0; i < N; i++) {
            if (!ipcs[i]) f++;
        }
        var i = randomInt(N)
        if ((seq & 1) && f < F && ipcs[i]) {
            abs[i].ipc.close()
        } else if (!ipcs[i] && abs[i].active) {
            abs[i].ipc.start()
        } else {
            limit++;
        }
        waitUntil(() => seqCounts[seq * 2] > 0)
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
