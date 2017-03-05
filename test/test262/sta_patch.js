// Copyright (c) 2017, Kotaro Endo.
// All rights reserved.
// License: "BSD-3-Clause"

var original = getPrecision;
getPrecision = function(a) {
    return 1.5 * original(a);
};

// for Tests S15.9.3.1_A5_T*.js
setSystemProperty("LocalTZA", -8 * 3600000);
setSystemProperty("LocalTZAString", "PDT");
