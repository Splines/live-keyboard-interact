/*
The MIT License (MIT)

Copyright (c) 2015 Shaba Abhiram

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// This is a modified version of the file you can find here:
// https://github.com/sabhiram/raspberry-wifi-conf/blob/master/app/dependency_manager.js

import async from 'async';
import { exec } from 'child_process';
import fs from 'fs';

interface ErrorCallback {
    (err: any);
}

// Check dependencies based on the input "deps" object.
// deps will contain: {"binaries": [...], "files":[...]}
export default function checkDependencies(deps, callback: ErrorCallback) {
    if (!(typeof (deps.binaries))) {
        deps['binaries'] = [];
    }
    if (!(typeof (deps.files))) {
        deps['files'] = [];
    }

    async.series([
        function checkBinaryDependencies(nextStep) {
            async.parallel(getCheckBinaryDependenciesFunctions(), nextStep);
        },
        function checkFileDependencies(nextStep) {
            async.parallel(getCheckFileDependenciesFunctions(), nextStep);
        }
    ], callback);

    function getCheckBinaryDependenciesFunctions() {
        return deps.binaries.map(binaryDependency => {
            return function (insideParallelNextStep) {
                const execCommand = `which ${binaryDependency}`
                exec(execCommand, (err, stdout, stderr) => {
                    if (err) return insideParallelNextStep(err);
                    if (stdout === '') return insideParallelNextStep(`"${execCommand}" returned no valid binary`);
                    return insideParallelNextStep(null);
                });
            }
        });
    }

    function getCheckFileDependenciesFunctions() {
        return deps.files.map(file => {
            return function (insideParallelNextStep) {
                fs.exists(file, (exists) => {
                    if (!exists) return insideParallelNextStep(`file ${file} does not exist`);
                    return insideParallelNextStep(null);
                });
            }
        });
    }

}