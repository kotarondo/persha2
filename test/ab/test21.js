// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

'use strict'

// config.M and config.HISTORY_SEQS functionality

require('./harness')

var PITCH
var lastPaused
var receivedSeqsP

function init(i) {
    var ab = abs[i]
    var origReceive = ab.onReceive
    ab.onReceive = function(value, seq) {
        origReceive.call(this, value, seq)
        if (seq === lastPaused + PITCH) {
            ab.pause()
            trace('test', i + " paused on " + seq)
            lastPaused = seq
        }
        receivedSeqsP[i] = Math.max(~~receivedSeqsP[i], seq)
    }
    var origSkip = ab.onSkip
    ab.onSkip = function(to, from) {
        origSkip.call(this, to, from)
        for (var j = 0; j < N; j++) {
            var x = receivedSeqsP[j]
            var c1 = 0
            var c2 = 0
            for (var k = 0; k < N; k++) {
                var y = receivedSeqsP[k]
                if (x < y) c1++;
                if (x <= y) c2++;
            }
            if (c1 < M && M <= c2) break
        }
        assert(j < N)
        assert(to + HISTORY_SEQS <= x, [to, x, receivedSeqsP])
    }
    initDrainLoop(i)
}

function test() {
    PITCH = BUFFER_SEQS + 1
    var base = lastPaused = randomInt(HISTORY_SEQS * 2)
    receivedSeqsP = []
    for (var i = 0; i < N; i++) {
        init(i)
    }
    waitUntil(() => (setImmediatesAreScheduled === 0))
    ctx.call(function() {
        assert_equals(lastPaused, base + PITCH * (N - M + 1))
        assert_equals(seqCounts[lastPaused + BUFFER_SEQS], M - 1)
        assert_equals(seqCounts[lastPaused + BUFFER_SEQS + 1], undefined)
        base = lastPaused
    })
    var i = 0
    ctx.loop(function() {
        if (abs[i].paused) {
            trace('test', i + " resumed")
            abs[i].resume()
            waitUntil(() => (setImmediatesAreScheduled === 0))
            ctx.call(function() {
                assert_equals(lastPaused, base + PITCH)
                assert_equals(seqCounts[lastPaused + BUFFER_SEQS], M - 1)
                assert_equals(seqCounts[lastPaused + BUFFER_SEQS + 1], undefined)
                base = lastPaused
            })
        }
        i++;
        if (i === N) ctx.break()
    })
    ctx.call(function() {
        i = 0
    })
    ctx.loop(function() {
        if (abs[i].paused) {
            restartEnv(i)
            init(i)
            waitUntil(() => (setImmediatesAreScheduled === 0))
            ctx.call(function() {
                assert_equals(lastPaused, base + PITCH)
                assert_equals(seqCounts[lastPaused + BUFFER_SEQS], M - 1)
                assert_equals(seqCounts[lastPaused + BUFFER_SEQS + 1], undefined)
                base = lastPaused
            })
        }
        i++;
        if (i === N) ctx.break()
    })
}

// trace_flag.push('test', 'skip')
// debug_flag = true

simTests(function() {
    nodeTests(function() {
        for (let m = 1; m <= N - F; m++) {
            if (m * 2 <= N) continue
            ctx.call(function() {
                M = m
                envTests(test, 1)
            })
        }
    })
})

ctx.end()
