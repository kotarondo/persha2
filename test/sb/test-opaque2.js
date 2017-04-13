// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

require('../harness')
var Sandbox = require('../../src/sandbox/index.js')

var sandbox = new Sandbox();
sandbox.initialize();

function Test(a, b) {
    this.a = a;
    this.b = b;
}

sandbox.setCustomFunction('Test', Test);
sandbox.evaluateProgram("var Test = new OpaqueFunction('Test')");

var x = sandbox.evaluateProgram("x = new Test(1, 'c')");
assert_equals(JSON.stringify(x), '{"a":1,"b":"c"}');

var xa = sandbox.evaluateProgram("x.a");
assert_equals(xa, undefined);

var xb = sandbox.evaluateProgram("x.b=2;x.b");
assert_equals(xb, 2);

var x2 = sandbox.evaluateProgram("x");
assert_equals(JSON.stringify(x2), '{"a":1,"b":"c"}');

function Test2(a, b) {
    var opaque = this.opaque;
    opaque.a = a;
    opaque.b = b;
}

sandbox.setCustomFunction('Test2', Test2);
sandbox.evaluateProgram("var Test2 = new OpaqueFunction('Test2', '', true)");

var x = sandbox.evaluateProgram("x = new Test2(1, 'c')");
assert_equals(JSON.stringify(x), '{}');
assert_equals(JSON.stringify(x.opaque), '{"a":1,"b":"c"}');

var xa = sandbox.evaluateProgram("x.a");
assert_equals(xa, undefined);

var xb = sandbox.evaluateProgram("x.b=2;x.b");
assert_equals(xb, 2);

var x2 = sandbox.evaluateProgram("x");
assert_equals(JSON.stringify(x2), '{"b":2}');
assert_equals(JSON.stringify(x2.opaque), '{"a":1,"b":"c"}');

function apply(f, args) {
    return f.apply(this, args);
}

var res3;

function test3(a, b) {
    res3 = [b, a];
    return res3;
}

sandbox.evaluateProgram("setSystemHandler('register', function(name, f){this[name]=f})");
sandbox.callSystemHandler('register', 'test3', new Sandbox.ExternalObject(test3));
sandbox.setCustomFunction('apply', apply);
sandbox.evaluateProgram("var apply = new OpaqueFunction('apply')");
var x3 = sandbox.evaluateProgram("apply(test3, [3, 'c'])");
assert_equals(JSON.stringify(x3), '["c",3]');
assert_equals(JSON.stringify(res3), '["c",3]');

test_success()
