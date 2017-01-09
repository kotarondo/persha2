// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

'use strict'

// node stop test

require('./harness')

function test() {
    randomExecution()
    dump()
    for (var i = 0; i < F; i++) {
        do {
            var j = randomInt(N)
        } while (states[j] == null)
        states[j] = null
    }
    dump()
    for (var i = 0; i < N; i++) {
        if (states[i] && states[i].vote) break
    }
    if (i === N) return
    finishConsensus()
    dump()
}

// debug_flag = true
for (var i = 0; i < 10; i++) {
    nodeEnvTests(test)
}

test_success()
