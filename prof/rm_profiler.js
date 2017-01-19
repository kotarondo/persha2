// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

'use strict'

var fs = require('fs')

var filename = process.argv[2]
var modname = filename.replace(/^.*?([^/.]*)\.js$/, "$1")
var code = fs.readFileSync(filename).toString()

var MAGIC = "// This is an automatically generated file by add_profiler.js\n"

if (code.indexOf(MAGIC) !== 0) {
    console.error("invalid: " + filename)
    return 1
}

console.log("converting " + filename)

code = code.replace(MAGIC, "")
code = code.replace(/ \$profile\.\S+ = \$profile\.\S+ \+ 1 \|\| 1\;/g, "")

fs.writeFileSync(filename, code)
