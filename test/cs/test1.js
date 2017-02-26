// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

'use strict'

// non-weak votes must have unique value in an even-round

/* error scenario
	1:A  A  B
	2:A
	--------- restart node1
	1:A  B  B
	2:A  B  B
	3:A  A  B*
	4:A  A
	5:A*
*/

require('./harness')

N = 3
F = 1

function test() {
    initStates('A', 'A', 'B')
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
for (var i = 0; i < 1; i++) {
    SET_WRITTEN = 1
    MERGE_ROUNDS = 0
    initEnv()
    test()
}

for (var i = 0; i < 20; i++) {
    prefixEnvTests(test)
}

test_success()
