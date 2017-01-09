/*
 Copyright (c) 2017, Kotaro Endo.
 All rights reserved.
 
 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions
 are met:
 
 1. Redistributions of source code must retain the above copyright
    notice, this list of conditions and the following disclaimer.
 
 2. Redistributions in binary form must reproduce the above
    copyright notice, this list of conditions and the following
    disclaimer in the documentation and/or other materials provided
    with the distribution.
 
 3. Neither the name of the copyright holder nor the names of its
    contributors may be used to endorse or promote products derived
    from this software without specific prior written permission.
 
 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

var exit_code = 1

process.on('beforeExit', function() {
    if (exit_code) {
        console.log("NG: unexpectedly exits")
        process.exit(exit_code)
    }
})

global.test_success = function() {
    exit_code = 0
    console.log("OK")
}

global.assert = function(expr, msg) {
    if (!expr) {
        var err = new Error("NG: assert failed: " + msg)
        debugger
        throw err
    }
}

global.assert_equals = function(act, exp) {
    assert(act == exp, act + " expected: " + exp)
}

global.debug_flag = false
global.trace_flag = false

global.debug = function() {
    if (!debug_flag) return
    console.log.apply(console, arguments)
}

global.trace = function() {
    if (!trace_flag) return
    console.log.apply(console, arguments)
}

global.perf_name = ""
global.perf_loops = 1
var startTime = Date.now()

global.start_perf = function() {
    startTime = Date.now()
}

global.end_perf = function() {
    var endTime = Date.now()
    var elapsed = endTime - startTime
    var val = elapsed / (perf_loops * 1000)
    var unit = " sec"
    if (val < 1) {
        val *= 1000
        unit = " msec"
        if (val < 1) {
            val *= 1000
            unit = " usec"
            if (val < 1) {
                val *= 1000
                unit = " nsec"
            }
        }
    }
    val = val.toPrecision(3)
    console.log("perf result: " + perf_name + "=" + val + unit)
}

global.obj_copy = function(obj) {
    if (obj instanceof Array) {
        var a = []
        for (var i = 0; i < obj.length; i++) {
            a[i] = obj_copy(obj[i])
        }
        return a
    }
    if (typeof obj !== "object") return obj
    var a = {}
    for (var i in obj) {
        a[i] = obj_copy(obj[i])
    }
    return a
}

global.randomInt = function(limit) {
    return Math.floor(limit * Math.random())
}

global.shuffle = function(array) {
    var len = array.length
    for (var i = 0; i < len * 8; i++) {
        var x = i % len
        var y = randomInt(len)
        var f = array[y]
        array[y] = array[x]
        array[x] = f
    }
}
