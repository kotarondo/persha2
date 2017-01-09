// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

// infinite loop under adaptive adversary
// If you want to avoid this, you should limit copy-vote only on every 4 rounds, for example.
// But it requires 3 votes to be stored in each node.

/* error scenario
	1:A  B
	2:a
	3: 
then
	1:A  B  B
	2:a  a  B
	3:B  A

OR

	1:A  B
	2:b
	3:
then
	1:A  B  A
	2:b  b  A
	3:A  B
*/

require('./harness')

N = 3
F = 1

function test() {
    initStates('A', 'B')
    writeVotes()
    dump()
    for (var i = 0; i < limit; i++) {
        assert(i < 100)
        var tag = states[0].vote.value[0].tag
        transferVote(1, 0)
        dump()
        if (states[0].vote.value[0].tag == tag) {
            transferVote(1, 2)
        } else {
            transferVote(0, 2)
        }
        writeVotes()
        dump()
        transferVote(0, 1)
        transferVote(2, 0)
        writeVotes()
        dump()
        if (checkAgreement()) break
    }
    finishConsensus()
    dump()
}

// debug_flag = true
for (var i = 0; i < 1; i++) {
    SET_WRITTEN = 0
    COLLAPSE_ROUNDS = 0
    MERGE_ROUNDS = 0
    limit = 100

    // error scenario
    // limit = Infinity

    initEnv()
    test()
}

for (var i = 0; i < 20; i++) {
    prefixEnvTests(test)
}

test_success()
