// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

'use strict'

// vlogOnStart() required

require('./harness')

N = 5
F = 1
M = 3
BUFFER_QUEUE = 1
BUFFER_SEQS = 10
HISTORY_SEQS = 5
COLLAPSE_SEQS = 10
COLLAPSE_ROUNDS = 10
MERGE_ROUNDS = 0

function test() {
    setSimTests(true, [20, 20, 10, 10, 10], [1000, 1000, 1000, 0, 0], [])
    var t = ['A', 'A', 'B', 'B', 'B']
    var x = 0
    ctx.loop(function() {
        x++;
        for (var i = 0; i < N; i++) {
            abs[i].broadcast({
                tag: t[i]
            })
        }
        waitUntil(() => seqCounts[x] >= 2)
        if (x > 7) ctx.break()
    })
    setSimTests(true, [], [], [0, 0, 0, 100, 100])
    ctx.call(function() {
        x = 0
        for (var i = 0; i < N; i++) {
            COLLAPSE_SEQS = 0
            restartEnv(i)
        }
    })
    ctx.loop(function() {
        x++;
        for (var i = 0; i < N; i++) {
            abs[i].broadcast({
                tag: 'Z'
            })
        }
        if (x > 7) ctx.break()
    })
    waitUntil(() => (setImmediatesAreScheduled === 0))
}

// trace_flag.push('all')
// debug_flag = true

var loop = 100
ctx.loop(function() {
    if (loop-- <= 0) ctx.break()
    fixedEnvTest(test)
})

ctx.end()
