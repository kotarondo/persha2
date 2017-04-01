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

function test() {
    var proto = [];
    var obj = Object.create(proto);
    Object.defineProperty(obj, "A", {
        value: 'A',
        writable: true,
        enumerable: true,
        configurable: true,
    });
    Object.defineProperty(proto, "B", {
        value: 'B2',
        writable: true,
        enumerable: true,
        configurable: true,
    });
    Object.defineProperty(obj, "B", {
        value: 'B',
        writable: true,
        enumerable: false,
        configurable: true,
    });
    Object.defineProperty(proto, "C", {
        value: 'C2',
        writable: true,
        enumerable: true,
        configurable: true,
    });
    Object.defineProperty(obj, "C", {
        get: function() {
            return "C"
        },
        enumerable: true,
        configurable: true,
    });
    Object.defineProperty(proto, "D", {
        value: 'D',
        writable: true,
        enumerable: true,
        configurable: true,
    });
    Object.defineProperty(proto, "E", {
        value: 'E',
        writable: false,
        enumerable: false,
        configurable: true,
    });
    Object.defineProperty(proto, "F", {
        get: function() {
            return "F"
        },
        enumerable: true,
        configurable: true,
    });
    return obj;
}

var result = sandbox.evaluateProgram("(" + test + ")()", "test.js");
assert_equals(Object.getOwnPropertyNames(result).toString(), 'A,B,C');
assert_equals(Object.keys(result).toString(), 'A,C');
var x = [];
for (var P in result) x.push(P, result[P]);
assert_equals(x.toString(), 'A,A,C,,D,D,F,');

test_success()