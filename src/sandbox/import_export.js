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

function exportValue(A, createObj) {
    if (A === empty) {
        return undefined;
    }
    if (isPrimitiveValue(A)) {
        return A;
    }
    try {
        return exportObject(A, new WeakMap(), createObj);
    } catch (e) {
        return undefined;
    }
}

function exportObject(A, map, createObj) {
    if (map.has(A)) {
        return map.get(A);
    }
    switch (A.Class) {
        case 'Buffer':
            return createObj('Buffer', A.wrappedBuffer);
        case 'Date':
            return createObj('Date', A.PrimitiveValue);
        case 'Function':
            return undefined;
        case 'Error':
            return createObj('Error', ToString(A.Get('name')), ToString(A.Get('message')));
        case 'Array':
            var a = createObj('Array', A.Get('length'));
            break;
        default:
            var a = createObj('Object');
            break;
    }
    map.set(A, a);
    var next = A.enumerator(true, true);
    var P;
    while (P = next()) {
        if (P === 'caller' || P === 'callee' || P === 'arguments') {
            continue;
        }
        var v = A.Get(P);
        if (!isPrimitiveValue(v)) {
            try {
                v = exportObject(v, map, createObj);
                if (v === undefined) continue;
            } catch (e) {
                continue;
            }
        }
        a[P] = v;
    }
    return a;
}

function importValue(a, classofObj) {
    if (isPrimitiveValue(a)) {
        return a;
    }
    try {
        return importObject(a, new WeakMap(), classofObj);
    } catch (e) {
        return undefined;
    }
}

function importObject(a, map, classofObj) {
    if (map.has(a)) {
        return map.get(a);
    }
    switch (classofObj(a)) {
        case 'Buffer':
            var A = VMObject(CLASSID_Buffer);
            A.Prototype = vm.Buffer_prototype;
            A.Extensible = true;
            A.wrappedBuffer = new Buffer(a);
            defineFinal(A, 'length', a.length);
            defineFinal(A, 'parent', A);
            return A;
        case 'Date':
            return Date_Construct([Number(a.getTime())]);
        case 'Function':
            return undefined;
        case 'Error':
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
        case 'Array':
            var A = Array_Construct([Number(a.length)]);
            break;
        default:
            var A = Object_Construct([]);
            break;
    }
    map.set(a, A);
    for (var P in a) {
        var v = a[P];
        if (!isPrimitiveValue(v)) {
            try {
                v = importObject(v, map, classofObj);
                if (v === undefined) continue;
            } catch (e) {
                continue;
            }
        }
        A.Put(P, v, false);
    }
    return A;
}
