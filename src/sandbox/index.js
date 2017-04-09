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

if (process.env.PERSHA2_SANDBOX_DEBUG) {
    var context = require("./context");
} else {
    var context = require("./optimized_context");
}

function Sandbox() {
    var realm;
    var stream;

    this.initialize = function() {
        context.initializeRealm();
        realm = context.getRealm();
    }

    this.setStream = function(s) {
        stream = s;
    }

    this.writeSnapshot = function() {
        context.setRealm(realm);
        context.writeSnapshot(stream);
    }

    this.readSnapshot = function() {
        context.readSnapshot(stream);
        realm = context.getRealm();
    }

    this.evaluateProgram = function(text, filename) {
        context.setRealm(realm);
        return context.evaluateProgram(text, filename);
    }

    this.callFunction = function(name) {
        context.setRealm(realm);
		var args = Array.prototype.slice.call(arguments, 1);
		var args = context.importArgumentsAndWriteToStream(args, stream);
        return context.callFunction(name, args);
    }

    this.applyFunction = function(name, args) {
        context.setRealm(realm);
		var args = context.importArgumentsAndWriteToStream(args, stream);
        return context.callFunction(name, args);
    }

}

module.exports = Sandbox;
