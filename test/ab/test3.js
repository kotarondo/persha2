// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

'use strict'

// test duplicate messages

require('./harness')

N = 3
F = 1
M = 2

function broadcast(x) {
    for (var i = 0; i < N; i++) {
        abs[i].broadcast({
            tag: String.fromCharCode(0x41 + x)
        })
    }
}

function test1() {
    broadcast(0)
    broadcast(0)
    ctx.sleep(30)
    ctx.call(function() {
        assert_equals(valueCounts.A, N, valueCounts)
    })
}

function test2() {
    var x = 0
    var loop = 1000
    ctx.loop(function() {
        assert(--loop >= 0)
        if (~~valueCounts.A === N * x) {
            broadcast(0)
            broadcast(0)
            x++;
            if (x >= 20) ctx.break()
        }
        ctx.sleep(1)
    })
}

// debug_flag = true
envTests(test1, 10)
envTests(test2, 10)

ctx.call(test_success)
