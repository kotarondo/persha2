// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

// infinite loop of MERGE_ROUNDS

/* error scenario
	1:A   A   B
	2:A  ab  ab
	3:A   A  AB
	4:A  ab  ab
	5:A   A  AB
	6:A  ab  ab
*/

require('./harness')

N = 3
F = 1

function test() {
    initStates('A', 'A', 'B')
    writeVotes()
    dump()
    for (var i = 0;; i++) {
        assert(i < 100)
        transferVote(1, 0)
        transferVote(2, 1)
        transferVote(1, 2)
        writeVotes()
        dump()
        transferVote(0, 1)
        transferVote(1, 0)
        transferVote(1, 2)
        writeVotes()
        dump()
        if (checkAgreement()) break
    }
}

// debug_flag = true
for (var i = 0; i < 1; i++) {
    SET_WRITTEN = 0
    COLLAPSE_ROUNDS = 0
    MERGE_ROUNDS = 100

    // error scenario
    // MERGE_ROUNDS = Infinity

    initEnv()
    test()
}

for (var i = 0; i < 20; i++) {
    prefixEnvTests(test)
}

test_success()
