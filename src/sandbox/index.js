/*
 Copyright (c) 2015-2017, Kotaro Endo.
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

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const filenames = ["helper.js", "type_constants.js", "import_export.js", "snapshot.js", "unicode.js", "regexp_compiler.js", "compiler.js", "builtinArray.js", "builtinBoolean.js", "builtinBuffer.js", "builtinDate.js", "builtinError.js", "builtinFunction.js", "builtinGlobal.js", "builtinJSON.js", "builtinMath.js", "builtinNumber.js", "builtinObject.js", "builtinRegExp.js", "builtinString.js", "conversion.js", "expression.js", "function.js", "statement.js", "program.js", "parser.js", "intrinsic.js", "execution.js", "types.js", "vm.js"];

var context = vm.createContext({
    Buffer: Buffer,
    console: console,
});

for (var filename of filenames) {
    var code = fs.readFileSync(path.join(__dirname, filename)).toString()
    vm.runInContext(code, context, {
        filename: filename,
        displayErrors: true,
    });
}

function createObj(Class, arg1, arg2, arg3) {
    switch (Class) {
        case 'Buffer':
            return new Buffer(arg1);
        case 'Date':
            return new Date(arg1);
        case 'Error':
            switch (arg1) {
                case 'TypeError':
                    var e = new TypeError(arg2);
                    break;
                case 'ReferenceError':
                    var e = new ReferenceError(arg2);
                    break;
                case 'RangeError':
                    var e = new RangeError(arg2);
                    break;
                case 'SyntaxError':
                    var e = new SyntaxError(arg2);
                    break;
                default:
                    var e = new Error(arg2);
                    break;
            }
            e.stack = arg3;
            return e;
        case 'Array':
            return new Array(arg1);
    }
    return {};
}

function classofObj(obj) {
    if (Array.isArray(obj)) return 'Array';
    if (Buffer.isBuffer(obj)) return 'Buffer';
    if (obj instanceof Date) return 'Date';
    if (obj instanceof Error) return 'Error';
    if (obj instanceof Function) return 'Function';
    return 'Object';
}

function Sandbox() {
    var vm;

    this.initializeVM = function() {
        context.initializeVM();
        vm = context.vm;
    }

    this.writeSnapshot = function(ostream) {
        context.vm = vm;
        context.writeSnapshot(ostream);
    }

    this.readSnapshot = function(istream) {
        context.readSnapshot(istream);
        vm = context.vm;
    }

    this.evaluateProgram = function(text, filename) {
        context.vm = vm;
        var result = context.evaluateProgram(text, filename);
        result.value = context.exportValue(result.value, createObj);
        return result;
    }
}

module.exports = Sandbox
