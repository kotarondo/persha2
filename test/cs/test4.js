// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

// must not deliver non-committed agreement vote

/* error scenario
	1:A   A   B
	2:A  -A
	3-A* -A*
	--------- restart node1
	1:A   A   B
	2:A   b   b
	3:A*  B   B
	4:    B   B
	5:        B*
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
    transferVote(0, 1)
    dump()

    // error scenario
    // states[1].sendable = states[1].vote
    // states[1].sent = {}

    transferVote(1, 0)
    dump()
    restartEnv(1)
    dump()
    transferVote(2, 1)
    writeVotes()
    dump()
    transferVote(1, 2)
    writeVotes()
    dump()
    transferVote(2, 1)
    writeVotes()
    dump()
    transferVote(1, 2)
    writeVotes()
    dump()
    finishConsensus()
    dump()
}

// debug_flag = true
for (var i = 0; i < 20; i++) {
    SET_WRITTEN = 0
    COLLAPSE_ROUNDS = 0
    MERGE_ROUNDS = 0
    initEnv()
    test()
}

for (var i = 0; i < 20; i++) {
    prefixEnvTests(test)
}

test_success()
