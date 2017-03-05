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

function exportValue(A) {
    if (A === empty) {
        return undefined;
    }
    if (isPrimitiveValue(A)) {
        return A;
    }
    return exportObject(A, new WeakMap());
}

function importValue(a) {
    if (isPrimitiveValue(a)) {
        return a;
    }
    return importObject(a, new WeakMap());
}

function exportObject(A, map) {
    if (map.has(A)) {
        return map.get(A);
    }
    if (A.Class === 'Buffer') {
        return {
            class: 'Buffer',
            value: new Buffer(A.wrappedBuffer), // safeguard
        };
    }
    if (A.Class === 'Date') {
        return {
            class: 'Date',
            value: A.PrimitiveValue,
        };
    }
    if (A.Class === 'Function') {
        return undefined;
    }
    if (A.Class === 'Error') {
        return {
            class: 'Error',
            name: ToString(A.Get('name')),
            message: ToString(A.Get('message')),
        };
    }

    if (A.Class === 'Array') {
        var a = {
            class: 'Array',
            length: A.Get('length'),
            value: [],
        };
    } else {
        var a = {
            class: 'Object',
            value: {},
        };
    }
    map.set(A, a);
    var next = A.enumerator(true, true);
    var P;
    while (P = next()) {
        if (P === 'caller' || P === 'callee' || P === 'arguments') {
            continue;
        }
        var v = A.Get(P);
        if (isPrimitiveValue(v)) {
            a.value[P] = v;
        } else {
            a.value[P] = exportObject(v, map);
        }
    }
    return a;
}

function importObject(a, map) {
    if (map.has(a)) {
        return map.get(a);
    }
    if (a.class === 'Buffer') {
        var A = VMObject(CLASSID_Buffer);
        A.Prototype = vm.Buffer_prototype;
        A.Extensible = true;
        A.wrappedBuffer = a;
        defineFinal(A, 'length', a.length);
        defineFinal(A, 'parent', A);
        return A;
    }
    if (a.class === 'Date') {
        return Date_Construct([a.value]);
    }
    if (a.class === 'Error') {
        var message = String(a.message);
        switch (a.name) {
            case 'TypeError':
                return TypeError_Construct([message]);
            case 'ReferenceError':
                return ReferenceError_Construct([message]);
            case 'RangeError':
                return RangeError_Construct([message]);
            case 'SyntaxError':
                return SyntaxError_Construct([message]);
            default:
                return Error_Construct([message]);
        }
    }

    if (a.class === 'Array') {
        var A = Array_Construct([Number(a.length)]);
    } else {
        var A = Object_Construct([]);
    }
    map.set(a, A);
    for (var P in a.value) {
        var v = a.value[P];
        if (isPrimitiveValue(v)) {
            A.Put(P, v, false);
        } else {
            A.Put(P, importObject(v, map), false);
        }
    }
    return A;
}

function export_evaluateProgram(text, filename) {
    var result = evaluateProgram(text, filename);
    result.value = exportValue(result.value);
    return result;
}
