// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

require('../harness')
var Sandbox = require('../../src/sandbox/index.js')

function stream() {
    this.buffer = [];
    this.index = 0;
}

stream.prototype.readInt =
    stream.prototype.readString =
    stream.prototype.readBuffer =
    stream.prototype.readNumber = function() {
        return this.buffer[this.index++];
    }

stream.prototype.writeInt =
    stream.prototype.writeString =
    stream.prototype.writeBuffer =
    stream.prototype.writeNumber = function(x) {
        this.buffer.push(x);
    }

stream.prototype.flush = function() {}

var sandbox = new Sandbox();
sandbox.setStream(new stream());
sandbox.initialize();
sandbox.evaluateProgram("setSystemHandler('echo', function(x){return x})");

var x0 = sandbox.callFunction('echo', undefined);
var x1 = sandbox.callFunction('echo', null);
var x2 = sandbox.callFunction('echo', 123456789);
var x3 = sandbox.callFunction('echo', '123456789a');
var x4 = sandbox.callFunction('echo', [0, 1]);
var x5 = sandbox.callFunction('echo', {
    a: 0,
    b: 1
});
var x6 = sandbox.callFunction('echo', new Number(100));
var x7 = sandbox.callFunction('echo', new String('abc'));
var x8 = sandbox.callFunction('echo', new Boolean(false));
var x9 = sandbox.callFunction('echo', new Date(0));
var x10 = sandbox.callFunction('echo', new RegExp('abc+', 'gmi'));
var x11 = sandbox.callFunction('echo', new Buffer('abc'));
var x12 = sandbox.callFunction('echo', [true, false]);
var x13 = sandbox.callFunction('echo', function(a, b, c) {});
var x14 = sandbox.callFunction('echo', new Error('abc'));
var x15 = sandbox.callFunction('echo', new TypeError('abc1'));
var x16 = sandbox.callFunction('echo', new ReferenceError('abc2'));
var x17 = sandbox.callFunction('echo', new RangeError('abc3'));
var x18 = sandbox.callFunction('echo', new SyntaxError('abc4'));
var x19 = sandbox.callFunction('echo', new URIError('abc5'));
var x20 = sandbox.callFunction('echo', new EvalError('abc6'));
var x21 = sandbox.callFunction('echo', [{
    a: 1,
    b: {
        c: 3
    }
}, , [, 7], ]);
check(sandbox);

function check(sandbox) {
    assert(typeof x0 === 'undefined');
    assert(typeof x1 === 'object');
    assert(typeof x2 === 'number');
    assert(typeof x3 === 'string');
    assert(x4 instanceof Array);
    assert(x5 instanceof Object);
    assert(x6 instanceof Number);
    assert(x7 instanceof String);
    assert(x8 instanceof Boolean);
    assert(x9 instanceof Date);
    assert(x10 instanceof RegExp);
    assert(x11 instanceof Buffer);
    assert(typeof x12[0] === 'boolean');
    assert(typeof x12[1] === 'boolean');
    assert(x14 instanceof Error);
    assert(x15 instanceof TypeError);
    assert(x16 instanceof ReferenceError);
    assert(x17 instanceof RangeError);
    assert(x18 instanceof SyntaxError);
    assert(x19 instanceof URIError);
    assert(x20 instanceof EvalError);

    assert_equals(x0, undefined);
    assert_equals(x1, null);
    assert_equals(x2, 123456789);
    assert_equals(x3, '123456789a');
    assert_equals(x4.toString(), '0,1');
    assert_equals(x5.toString(), '[object Object]');
    assert_equals(JSON.stringify(x5), '{"a":0,"b":1}');
    assert_equals(x6.toString(), '100');
    assert_equals(x7.toString(), 'abc');
    assert_equals(x8.toString(), 'false');
    assert_equals(x9.toString(), new Date(0).toString());
    assert(x10.toString().match(/\/abc\+\/[gmi]{3,3}/));
    assert_equals(x11.toString(), 'abc');
    assert_equals(x12.toString(), 'true,false');
    assert_equals(x14.toString(), 'Error: abc');
    assert_equals(x15.toString(), 'TypeError: abc1');
    assert_equals(x16.toString(), 'ReferenceError: abc2');
    assert_equals(x17.toString(), 'RangeError: abc3');
    assert_equals(x18.toString(), 'SyntaxError: abc4');
    assert_equals(x19.toString(), 'URIError: abc5');
    assert_equals(x20.toString(), 'EvalError: abc6');
}

test_success()
