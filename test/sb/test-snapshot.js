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

var sandbox1 = new Sandbox();
sandbox1.initialize();
sandbox1.evaluateProgram("x0=undefined");
sandbox1.evaluateProgram("x1=null");
sandbox1.evaluateProgram("x2=123456789");
sandbox1.evaluateProgram("x3='123456789a'");
sandbox1.evaluateProgram("x4=[0,1]");
sandbox1.evaluateProgram("x5={a:0, b:1}");
sandbox1.evaluateProgram("x6=new Number(100)");
sandbox1.evaluateProgram("x7=new String('abc')");
sandbox1.evaluateProgram("x8=new Boolean(false)");
sandbox1.evaluateProgram("x9=new Date(0)");
sandbox1.evaluateProgram("x10=new RegExp('abc+','gmi')");
sandbox1.evaluateProgram("x11=new Buffer('abc')");
sandbox1.evaluateProgram("x12=[true, false]");
sandbox1.evaluateProgram("function x13(a,b,c){};x13");
sandbox1.evaluateProgram("x14=new Error('abc')", "filename");
sandbox1.evaluateProgram("x15=new TypeError('abc1')", "filename1");
sandbox1.evaluateProgram("x16=new ReferenceError('abc2')", "filename2");
sandbox1.evaluateProgram("x17=new RangeError('abc3')", "filename3");
sandbox1.evaluateProgram("x18=new SyntaxError('abc4')", "filename4");
sandbox1.evaluateProgram("x19=new URIError('abc5')", "filename5");
sandbox1.evaluateProgram("x20=new EvalError('abc6')", "filename6");
sandbox1.evaluateProgram("x21=[{a:1,b:{c:3}},,[,7],];x21.length=4;Object.freeze(x21);x21");
sandbox1.evaluateProgram("setSystemHandler('test', function(){return 'abc'})");
check(sandbox1);

function check(sandbox) {
    assert(typeof sandbox.evaluateProgram("x0") === 'undefined');
    assert(typeof sandbox.evaluateProgram("x1") === 'object');
    assert(typeof sandbox.evaluateProgram("x2") === 'number');
    assert(typeof sandbox.evaluateProgram("x3") === 'string');
    assert(sandbox.evaluateProgram("x4") instanceof Array);
    assert(sandbox.evaluateProgram("x5") instanceof Object);
    assert(sandbox.evaluateProgram("x6") instanceof Number);
    assert(sandbox.evaluateProgram("x7") instanceof String);
    assert(sandbox.evaluateProgram("x8") instanceof Boolean);
    assert(sandbox.evaluateProgram("x9") instanceof Date);
    assert(sandbox.evaluateProgram("x10") instanceof RegExp);
    assert(sandbox.evaluateProgram("x11") instanceof Buffer);
    assert(typeof sandbox.evaluateProgram("x12")[0] === 'boolean');
    assert(typeof sandbox.evaluateProgram("x12")[1] === 'boolean');
    assert(sandbox.evaluateProgram("x13") instanceof Function);
    assert(sandbox.evaluateProgram("x14") instanceof Error);
    assert(sandbox.evaluateProgram("x15") instanceof TypeError);
    assert(sandbox.evaluateProgram("x16") instanceof ReferenceError);
    assert(sandbox.evaluateProgram("x17") instanceof RangeError);
    assert(sandbox.evaluateProgram("x18") instanceof SyntaxError);
    assert(sandbox.evaluateProgram("x19") instanceof URIError);
    assert(sandbox.evaluateProgram("x20") instanceof EvalError);
    assert(sandbox.evaluateProgram("getSystemHandler('test')") instanceof Function);

    assert(sandbox.evaluateProgram("x0") === sandbox.evaluateProgram("x0"));
    assert(sandbox.evaluateProgram("x1") === sandbox.evaluateProgram("x1"));
    assert(sandbox.evaluateProgram("x2") === sandbox.evaluateProgram("x2"));
    assert(sandbox.evaluateProgram("x3") === sandbox.evaluateProgram("x3"));
    assert(sandbox.evaluateProgram("x4") === sandbox.evaluateProgram("x4"));
    assert(sandbox.evaluateProgram("x5") === sandbox.evaluateProgram("x5"));
    assert(sandbox.evaluateProgram("x12") === sandbox.evaluateProgram("x12"));
    assert(sandbox.evaluateProgram("x13") === sandbox.evaluateProgram("x13"));
    assert(sandbox.evaluateProgram("x21") === sandbox.evaluateProgram("x21"));
    assert(sandbox.evaluateProgram("getSystemHandler('test')") === sandbox.evaluateProgram("getSystemHandler('test')"));

    assert_equals(sandbox.evaluateProgram("x0"), undefined);
    assert_equals(sandbox.evaluateProgram("x1"), null);
    assert_equals(sandbox.evaluateProgram("x2"), 123456789);
    assert_equals(sandbox.evaluateProgram("x3"), '123456789a');
    assert_equals(sandbox.evaluateProgram("x4").toString(), '0,1');
    assert_equals(sandbox.evaluateProgram("x5").toString(), '[object Object]');
    assert_equals(JSON.stringify(sandbox.evaluateProgram("x5")), '{"a":0,"b":1}');
    assert_equals(sandbox.evaluateProgram("x6").toString(), '100');
    assert_equals(sandbox.evaluateProgram("x7").toString(), 'abc');
    assert_equals(sandbox.evaluateProgram("x8").toString(), 'false');
    assert_equals(sandbox.evaluateProgram("x9").toString(), new Date(0).toString());
    assert(sandbox.evaluateProgram("x10").toString().match(/\/abc\+\/[gmi]{3,3}/));
    assert_equals(sandbox.evaluateProgram("x11").toString(), 'abc');
    assert_equals(sandbox.evaluateProgram("x12").toString(), 'true,false');
    assert_equals(sandbox.evaluateProgram("x14").toString(), 'Error: abc');
    assert_equals(sandbox.evaluateProgram("x15").toString(), 'TypeError: abc1');
    assert_equals(sandbox.evaluateProgram("x16").toString(), 'ReferenceError: abc2');
    assert_equals(sandbox.evaluateProgram("x17").toString(), 'RangeError: abc3');
    assert_equals(sandbox.evaluateProgram("x18").toString(), 'SyntaxError: abc4');
    assert_equals(sandbox.evaluateProgram("x19").toString(), 'URIError: abc5');
    assert_equals(sandbox.evaluateProgram("x20").toString(), 'EvalError: abc6');

    assert_equals(sandbox.evaluateProgram("x13").length, 3);
    try {
        sandbox.evaluateProgram("x13")();
        var err = null;
    } catch (e) {
        var err = e;
    }
    assert(err instanceof TypeError, err);

    assert_equals(sandbox.evaluateProgram("x14").stack, 'Error: abc\n    at filename:1:1');
    assert_equals(sandbox.evaluateProgram("x15").stack, 'TypeError: abc1\n    at filename1:1:1');
    assert_equals(sandbox.evaluateProgram("x16").stack, 'ReferenceError: abc2\n    at filename2:1:1');
    assert_equals(sandbox.evaluateProgram("x17").stack, 'RangeError: abc3\n    at filename3:1:1');
    assert_equals(sandbox.evaluateProgram("x18").stack, 'SyntaxError: abc4\n    at filename4:1:1');
    assert_equals(sandbox.evaluateProgram("x19").stack, 'URIError: abc5\n    at filename5:1:1');
    assert_equals(sandbox.evaluateProgram("x20").stack, 'EvalError: abc6\n    at filename6:1:1');

    assert_equals(JSON.stringify(sandbox.evaluateProgram("x21")), '[{"a":1,"b":{"c":3}},null,[null,7],null]');
    assert_equals(sandbox.evaluateProgram("x21").join(), '[object Object],,,7,');
    assert(!Object.isFrozen(sandbox.evaluateProgram("x21")));
    assert(!Object.isSealed(sandbox.evaluateProgram("x21")));
    assert_equals(Object.keys(sandbox.evaluateProgram("x21")).join(), '0,2');
    sandbox.evaluateProgram("x21")[5] = 5;
    assert_equals(Object.keys(sandbox.evaluateProgram("x21")).join(), '0,2');

    assert_equals(sandbox.evaluateProgram("getSystemHandler('test')()"), 'abc');
}

var s = new stream();
sandbox1.setStream(s);
sandbox1.writeSnapshot();
var sandbox2 = new Sandbox();
sandbox2.setStream(s);
sandbox2.readSnapshot();
check(sandbox2);

var s = new stream();
sandbox2.setStream(s);
sandbox2.writeSnapshot();
var sandbox3 = new Sandbox();
sandbox3.setStream(s);
sandbox3.readSnapshot();
check(sandbox3);

test_success()
