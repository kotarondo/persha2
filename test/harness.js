// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

'use strict'

require('../prof/profiler_util.js')

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
        var err = new Error("NG: assert failed:" + msg)
        debugger
        throw err
    }
}

global.assert_equals = function(act, exp) {
    assert(act === exp, "actual: " + act + " expected: " + exp)
}

global.debug_flag = false
global.trace_flag = []

global.debug = function() {
    if (!debug_flag) return
    console.log.apply(console, arguments)
}

global.trace = function(f) {
    if (trace_flag.indexOf('all') < 0 && trace_flag.indexOf(f) < 0) return
    console.log.apply(console, Array.prototype.slice.call(arguments, 1))
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

global.setImmediatesAreScheduled = 0
var orig_setImmediate = setImmediate

global.hooked_setImmediate = function(func) {
    var args = Array.prototype.slice.call(arguments, 1)
    setImmediatesAreScheduled++;
    orig_setImmediate(function() {
        setImmediatesAreScheduled--;
        func.apply(null, args)
    })
}

global.sim_clock = 0
var sim_scheduled = false
var sim_queue = []

global.sim_setTimeout = function(func, delay) {
    assert_equals(arguments.length, 2)
    var list = sim_queue[delay]
    if (!list) {
        var list = sim_queue[delay] = []
    }
    list.push(func)
    if (!sim_scheduled) {
        hooked_setImmediate(sim_purge)
        sim_scheduled = true
    }
}

global.sim_setImmediate = function(func) {
    var args = Array.prototype.slice.call(arguments)
    args[0] = null
    var f = Function.prototype.bind.apply(func, args)
    sim_setTimeout(f, 0)
}

function sim_purge() {
    assert(sim_scheduled)
    var c = randomInt(10)
    while (c--) {
        if (!sim_purge1()) {
            sim_scheduled = false
            return
        }
    }
    hooked_setImmediate(sim_purge)
}

function sim_purge1() {
    for (var i = 0; i < sim_queue.length; i++) {
        var list = sim_queue[i]
        if (list && list.length) {
            if (i > 0) {
                sim_clock += i
                trace('clock', "clock " + sim_clock + "(+" + i + ")")
                sim_queue = sim_queue.slice(i)
            }
            var func = list.shift()
            func()
            return true
        }
    }
    return false
}

global.toStringCustomized = {}

Object.defineProperty(toStringCustomized, "toString", {
    "value": toStringObject,
    "writable": true,
    "enumerable": false,
    "configurable": true,
})

function toStringObject() {
    var s = "{"
    for (var v in this) {
        s += v + ":" + this[v] + ", "
    }
    return s + "}"
}
