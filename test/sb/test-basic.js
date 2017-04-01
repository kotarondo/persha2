// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

require('../harness')
var Sandbox = require('../../src/sandbox/index.js')
var fs = require('fs')

var succ = 0
var fail = 0

process.chdir(__dirname)
process.chdir("basic")

var filenames = fs.readdirSync(".")

while (filenames.length) {
    var filename = filenames.pop()
    if (!/^test.*\.js$/.test(filename)) continue
    console.log(filename)
    var source = fs.readFileSync(filename).toString();
    var sandbox = new Sandbox();
    sandbox.initialize();
    try {
        var value = sandbox.evaluateProgram(source, filename);
        if (value && value[2] === "DONE" && JSON.stringify(value[0]) === JSON.stringify(value[1])) {
            succ++;
        }
    } catch (err) {
        console.log(err)
        fail++;
    }
}

assert(!fail)
test_success()
