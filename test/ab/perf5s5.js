// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

'use strict'

console.log("performance at 5 nodes, serial, 5 threads")

require('./harness')

N = 5
F = 2
M = 3
BUFFER_QUEUE = 4
BUFFER_SEQS = 10
HISTORY_SEQS = 20
MERGE_ROUNDS = 10

function test() {
    for (var i = 0; i < N; i++) {
        initSerialLoop(i)
    }
    waitUntil(() => seqCounts[100] === N)
    ctx.call(function() {
        var sent = Math.floor(totalValueCounts() / N)
        console.log(" ipc_delay=" + 2 * sim_ipc_delays[0] + "ms" +
            " vlog_delay=" + sim_vlog_delays[0] + "ms" +
            " time=" + sim_clock + "ms" +
            " sent=" + sent +
            " avg=" + Math.floor(sim_clock / sent) + "ms")
    })
}

// trace_flag.push('all')
// debug_flag = true

setSimTests(true, [5, 5, 5, 5, 5, 5, 5], [5, 5, 5, 5, 5, 5, 5], [])
fixedEnvTest(test)
setSimTests(true, [50, 50, 50, 50, 50, 50, 50], [5, 5, 5, 5, 5, 5, 5], [])
fixedEnvTest(test)
setSimTests(true, [5, 5, 5, 5, 5, 5, 5], [50, 50, 50, 50, 50, 50, 50], [])
fixedEnvTest(test)

ctx.end()
