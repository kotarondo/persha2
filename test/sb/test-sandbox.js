// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

require('../harness')

var global_names = Object.getOwnPropertyNames(global)
var Sandbox = require('../../src/sandbox/index.js')

Object.getOwnPropertyNames(global).forEach(function(e) {
    assert(e.indexOf("_persha2sb") === 0 || global_names.indexOf(e) >= 0, e)
})

var sandbox1 = new Sandbox();
sandbox1.initialize();
var value = sandbox1.evaluateProgram("test=1");
assert_equals(value, 1)

Object.getOwnPropertyNames(global).forEach(function(e) {
    assert(e.indexOf("_persha2sb") === 0 || global_names.indexOf(e) >= 0, e)
})

var sandbox2 = new Sandbox();
sandbox2.initialize();
try {
    sandbox2.evaluateProgram("test");
    assert(false, "must throw ReferenceError")
} catch (err) {
    assert(err instanceof ReferenceError)
}

Object.getOwnPropertyNames(global).forEach(function(e) {
    assert(e.indexOf("_persha2sb") === 0 || global_names.indexOf(e) >= 0, e)
})

var value = sandbox1.evaluateProgram("++test");
assert_equals(value, 2)

Object.getOwnPropertyNames(global).forEach(function(e) {
    assert(e.indexOf("_persha2sb") === 0 || global_names.indexOf(e) >= 0, e)
})

test_success()
