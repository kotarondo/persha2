// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

require('../harness')
var Sandbox = require('../../src/sandbox/index.js')

var sandbox = new Sandbox();
sandbox.initialize();

try {
    sandbox.evaluateProgram("throw new Error('abc')", "test.js");
} catch (e) {
    assert(e instanceof Error);
    assert_equals(e.toString(), 'Error: abc');
    assert_equals(e.stack, 'Error: abc\n    at test.js:1:7');
}

try {
    sandbox.evaluateProgram("throw {mes: 'test'}", "test.js");
} catch (e) {
    assert(e instanceof Object);
    assert_equals(e.toString(), '[object Object]');
    assert_equals(JSON.stringify(e), '{"mes":"test"}');
}

try {
    sandbox.evaluateProgram("var var", "test.js");
} catch (e) {
    assert(e instanceof SyntaxError);
    assert_equals(e.toString(), 'SyntaxError: test.js:1:5');
}

test_success()
