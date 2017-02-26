// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

'use strict'

// must not change a weak vote to a non-weak vote

/* error scenario
	1:A  B  B
	2:a  a
	3:A  
	--------- restart node1
	1:   B  B
	2:a  B  B
	3:A  A  B*
	4:A  A
	5:A*
*/

require('./harness')

N = 3
F = 1

function test() {
    initStates('A', 'B', 'B')
    writeVotes()
    dump()
    transferVote(0, 1)
    writeVotes()
    dump()
    transferVote(1, 0)
    writeVotes()
    dump()

    // error scenario
    // COLLAPSE_ROUNDS = 0

    restartEnv(1)
    dump()
    transferVote(2, 1)
    writeVotes()
    dump()
    transferVote(1, 2)
    writeVotes()
    dump()
    transferVote(1, 0)
    writeVotes()
    dump()
    transferVote(0, 1)
    writeVotes()
    dump()
    transferVote(1, 0)
    writeVotes()
    dump()
    finishConsensus()
    dump()
}

// debug_flag = true
for (var i = 0; i < 20; i++) {
    SET_WRITTEN = 0
    MERGE_ROUNDS = 0
    initEnv()
    test()
}

for (var i = 0; i < 20; i++) {
    prefixEnvTests(test)
}

test_success()
