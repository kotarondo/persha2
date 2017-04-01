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

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var filenames = ["helper.js", "type_constants.js", "import.js", "export.js", "snapshot.js", "unicode.js", "regexp_compiler.js", "compiler.js", "builtinArray.js", "builtinBoolean.js", "builtinBuffer.js", "builtinDate.js", "builtinError.js", "builtinFunction.js", "builtinGlobal.js", "builtinJSON.js", "builtinMath.js", "builtinNumber.js", "builtinObject.js", "builtinRegExp.js", "builtinString.js", "conversion.js", "expression.js", "function.js", "statement.js", "program.js", "parser.js", "intrinsic.js", "execution.js", "types.js", "realm.js"];

var context = vm.createContext({
    Buffer: Buffer,
    console: console,
});

for (var filename of filenames) {
    var code = fs.readFileSync(path.join(__dirname, "core", filename)).toString()
    vm.runInContext(code, context, {
        filename: filename,
        displayErrors: true,
    });
}

context.getRealm = function() {
    return this.realm;
};

context.setRealm = function(realm) {
    this.realm = realm;
};

module.exports = context;
