// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

'use strict'

global.$profile = {}
var stack_profile = {}

global.take_stack_profile = function take_stack_profile(depth) {
    var obj = {}
    Error.captureStackTrace(obj, take_stack_profile)
    var stack = obj.stack.split('\n')
    var x = ''
    for (var i = 0; i < (depth || 2); i++) {
        x += '\n' + stack[i + 1]
    }
    stack_profile[x] = stack_profile[x] + 1 || 1
}

function profile_print(name, profile, lines) {
    var results = Object.keys(profile)
    if (!results.length) return
    results.sort(function(x, y) {
        return profile[y] - profile[x]
    })
    console.log(name + " TOP " + lines)
    results.every(function(x) {
        console.log(profile[x] + " : " + x)
        return (--lines > 0)
    })
}

process.on('exit', function() {
    profile_print("functions", $profile, 30)
    profile_print("stacks", stack_profile, 10)
})
