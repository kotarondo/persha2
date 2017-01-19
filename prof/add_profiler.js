// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

'use strict'

var fs = require('fs')

var filename = process.argv[2]
var modname = filename.replace(/^.*?([^/.]*)\.js$/, "$1")
var code = fs.readFileSync(filename).toString()

var MAGIC = "// This is an automatically generated file by add_profiler.js\n"

if (code.indexOf(MAGIC) >= 0) {
    console.error("already converted: " + filename)
    return 1
}

console.log("converting " + filename)

code = code.replace(/^function *(\S+) *\(.*?\) *\{$/gm, function(matched, cap1) {
    var name = modname + '$' + cap1
    return matched + " $profile." + name + " = $profile." + name + " + 1 || 1;"
})

fs.writeFileSync(filename, MAGIC + code)
