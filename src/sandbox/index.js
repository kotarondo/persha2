const fs = require('fs')
const path = require('path')
const vm = require('vm')

const filenames = ["helper.js", "type_constants.js", "import_export.js", "snapshot.js", "unicode.js", "regexp_compiler.js", "compiler.js", "builtinArray.js", "builtinBoolean.js", "builtinBuffer.js", "builtinDate.js", "builtinError.js", "builtinFunction.js", "builtinGlobal.js", "builtinJSON.js", "builtinMath.js", "builtinNumber.js", "builtinObject.js", "builtinRegExp.js", "builtinString.js", "conversion.js", "expression.js", "function.js", "statement.js", "program.js", "parser.js", "intrinsic.js", "execution.js", "types.js", "vm.js"]

const exposes = ["initializeVM", "writeSnapshot", "readSnapshot", "evaluateProgram"]

var codes = []
for (var filename of filenames) {
    codes[filename] = fs.readFileSync(path.join(__dirname, filename)).toString()
}

function Sandbox() {
    var context = vm.createContext({
        Buffer: Buffer,
        console: console,
    })
    for (var filename of filenames) {
        vm.runInContext(codes[filename], context, {
            filename: filename,
            displayErrors: true,
        })
    }
    for (var expose of exposes) {
        this[expose] = context[expose]
    }

    this.evaluateProgram = function(text, filename) {
        var result = context.export_evaluateProgram(text, filename);
        result.value = importValue(result.value);
        return result;
    }
}

function isPrimitiveValue(x) {
    switch (typeof x) {
        case "undefined":
        case "boolean":
        case "number":
        case "string":
            return true;
    }
    if (x === null) return true;
    return false;
}

function exportValue(A) {
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
    if (A instanceof Buffer) {
        return {
            class: 'Buffer',
            value: new Buffer(A), // safeguard
        };
    }
    if (A instanceof Date) {
        return {
            class: 'Date',
            value: A.getTime(),
        };
    }
    if (A instanceof Function) {
        return undefined;
    }
    if (A instanceof Error) {
        return {
            class: 'Error',
            name: String(A.name),
            message: String(A.message),
        };
    }

    if (A instanceof Array) {
        var a = {
            class: 'Array',
            length: A.length,
            value: [],
        };
    } else {
        var a = {
            class: 'Object',
            value: {},
        };
    }
    map.set(A, a);
    for (var P in A) {
        if (!A.hasOwnProperty(P)) continue;
        if (P === 'caller' || P === 'callee' || P === 'arguments') {
            continue;
        }
        var v = A[P];
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
        return a.value;
    }
    if (a.class === 'Date') {
        return new Date(a.value);
    }
    if (a.class === 'Error') {
        var message = String(a.message);
        switch (a.name) {
            case 'TypeError':
                return new TypeError(message);
            case 'ReferenceError':
                return new ReferenceError(message);
            case 'RangeError':
                return new RangeError(message);
            case 'SyntaxError':
                return new SyntaxError(message);
            default:
                return new Error(message);
        }
    }

    if (a.class === 'Array') {
        var A = new Array(Number(a.length));
    } else {
        var A = {};
    }
    map.set(a, A);
    for (var P in a.value) {
        var v = a.value[P];
        if (isPrimitiveValue(v)) {
            A[P] = v;
        } else {
            A[P] = importObject(v, map);
        }
    }
    return A;
}

function export_evaluateProgram(text, filename) {
    var result = evaluateProgram(text, filename);
    result.value = exportValue(result.value);
    return result;
}

module.exports = Sandbox
