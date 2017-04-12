// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

require('../harness')
var Sandbox = require('../../src/sandbox/index.js')
var fs = require('fs')

var sandbox = new Sandbox()
sandbox.initialize()
sandbox.setCustomFunction("print", console.log);
sandbox.evaluateProgram("print=new OpaqueFunction('print')");

process.chdir(__dirname)
process.chdir("v8bench")

function load(f) {
    sandbox.evaluateProgram(fs.readFileSync(f).toString(), f);
}

load('base.js');

load('richards.js');
load('deltablue.js');
load('crypto.js');
load('raytrace.js');
load('earley-boyer.js');
load('regexp.js');
load('splay.js');
load('navier-stokes.js');

load("run.js");

test_success();
