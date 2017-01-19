#!/bin/bash
# Copyright (c) 2017, Kotaro Endo.
# All rights reserved.
# License: "BSD-3-Clause"

FILES=$*

if [ -z "$FILES" ]; then
	FILES="../src/*"
fi

for file in $FILES; do
	node ./add_profiler.js $file
done
