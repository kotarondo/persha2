// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

require('../harness')
var Sandbox = require('../../src/sandbox/index.js')
var sandbox = new Sandbox();
sandbox.initialize();

var builtins = [
    "Object",
    "Function",
    "Array",
    "String",
    "Boolean",
    "Number",
    "Date",
    "RegExp",
    "Error",
    "EvalError",
    "RangeError",
    "ReferenceError",
    "SyntaxError",
    "TypeError",
    "URIError",
    "eval",
    "parseInt",
    "parseFloat",
    "isNaN",
    "isFinite",
    "decodeURI",
    "decodeURIComponent",
    "encodeURI",
    "encodeURIComponent",
    "escape",
    "unescape",
    "Object.getPrototypeOf",
    "Object.getOwnPropertyDescriptor",
    "Object.getOwnPropertyNames",
    "Object.create",
    "Object.defineProperty",
    "Object.defineProperties",
    "Object.seal",
    "Object.freeze",
    "Object.preventExtensions",
    "Object.isSealed",
    "Object.isFrozen",
    "Object.isExtensible",
    "Object.keys",
    "Object.prototype.toString",
    "Object.prototype.toLocaleString",
    "Object.prototype.valueOf",
    "Object.prototype.hasOwnProperty",
    "Object.prototype.isPrototypeOf",
    "Object.prototype.propertyIsEnumerable",
    "Function.prototype.toString",
    "Function.prototype.apply",
    "Function.prototype.call",
    "Function.prototype.bind",
    "Array.isArray",
    "Array.prototype.toString",
    "Array.prototype.toLocaleString",
    "Array.prototype.concat",
    "Array.prototype.join",
    "Array.prototype.pop",
    "Array.prototype.push",
    "Array.prototype.reverse",
    "Array.prototype.shift",
    "Array.prototype.slice",
    "Array.prototype.sort",
    "Array.prototype.splice",
    "Array.prototype.unshift",
    "Array.prototype.indexOf",
    "Array.prototype.lastIndexOf",
    "Array.prototype.every",
    "Array.prototype.some",
    "Array.prototype.forEach",
    "Array.prototype.map",
    "Array.prototype.filter",
    "Array.prototype.reduce",
    "Array.prototype.reduceRight",
    "String.fromCharCode",
    "String.prototype.toString",
    "String.prototype.valueOf",
    "String.prototype.charAt",
    "String.prototype.charCodeAt",
    "String.prototype.concat",
    "String.prototype.indexOf",
    "String.prototype.lastIndexOf",
    "String.prototype.localeCompare",
    "String.prototype.match",
    "String.prototype.replace",
    "String.prototype.search",
    "String.prototype.slice",
    "String.prototype.split",
    "String.prototype.substring",
    "String.prototype.toLowerCase",
    "String.prototype.toLocaleLowerCase",
    "String.prototype.toUpperCase",
    "String.prototype.toLocaleUpperCase",
    "String.prototype.trim",
    "String.prototype.substr",
    "Boolean.prototype.toString",
    "Boolean.prototype.valueOf",
    "Number.prototype.toString",
    "Number.prototype.toLocaleString",
    "Number.prototype.valueOf",
    "Number.prototype.toFixed",
    "Number.prototype.toExponential",
    "Number.prototype.toPrecision",
    "Math.abs",
    "Math.acos",
    "Math.asin",
    "Math.atan",
    "Math.atan2",
    "Math.ceil",
    "Math.cos",
    "Math.exp",
    "Math.floor",
    "Math.log",
    "Math.max",
    "Math.min",
    "Math.pow",
    "Math.random",
    "Math.round",
    "Math.sin",
    "Math.sqrt",
    "Math.tan",
    "Date.parse",
    "Date.UTC",
    "Date.now",
    "Date.prototype.toString",
    "Date.prototype.toDateString",
    "Date.prototype.toTimeString",
    "Date.prototype.toLocaleString",
    "Date.prototype.toLocaleDateString",
    "Date.prototype.toLocaleTimeString",
    "Date.prototype.valueOf",
    "Date.prototype.getTime",
    "Date.prototype.getFullYear",
    "Date.prototype.getUTCFullYear",
    "Date.prototype.getMonth",
    "Date.prototype.getUTCMonth",
    "Date.prototype.getDate",
    "Date.prototype.getUTCDate",
    "Date.prototype.getDay",
    "Date.prototype.getUTCDay",
    "Date.prototype.getHours",
    "Date.prototype.getUTCHours",
    "Date.prototype.getMinutes",
    "Date.prototype.getUTCMinutes",
    "Date.prototype.getSeconds",
    "Date.prototype.getUTCSeconds",
    "Date.prototype.getMilliseconds",
    "Date.prototype.getUTCMilliseconds",
    "Date.prototype.getTimezoneOffset",
    "Date.prototype.setTime",
    "Date.prototype.setMilliseconds",
    "Date.prototype.setUTCMilliseconds",
    "Date.prototype.setSeconds",
    "Date.prototype.setUTCSeconds",
    "Date.prototype.setMinutes",
    "Date.prototype.setUTCMinutes",
    "Date.prototype.setHours",
    "Date.prototype.setUTCHours",
    "Date.prototype.setDate",
    "Date.prototype.setUTCDate",
    "Date.prototype.setMonth",
    "Date.prototype.setUTCMonth",
    "Date.prototype.setFullYear",
    "Date.prototype.setUTCFullYear",
    "Date.prototype.toUTCString",
    "Date.prototype.toISOString",
    "Date.prototype.toJSON",
    "Date.prototype.getYear",
    "Date.prototype.setYear",
    "RegExp.prototype.exec",
    "RegExp.prototype.test",
    "RegExp.prototype.toString",
    "Error.prototype.toString",
    "JSON.parse",
    "JSON.stringify",
    "Object.getOwnPropertyDescriptor( Object.prototype, '__proto__').get",
    "Object.getOwnPropertyDescriptor( Object.prototype, '__proto__').get",
];

for (var i = 0; i < builtins.length; i++) {
    var func = builtins[i];
    var act = sandbox.evaluateProgram(func + ".name");
    var ref = eval(func + ".name");
    assert_equals(act, ref);
}

test_success();
