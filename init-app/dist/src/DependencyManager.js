"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const async_1 = __importDefault(require("async"));
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
function checkDependencies(deps, callback) {
    if (!(typeof (deps.binaries))) {
        deps['binaries'] = [];
    }
    if (!(typeof (deps.files))) {
        deps['files'] = [];
    }
    async_1.default.series([
        function checkBinaryDependencies(nextStep) {
            async_1.default.parallel(getCheckBinaryDependenciesFunctions(), nextStep);
        },
        function checkFileDependencies(nextStep) {
            async_1.default.parallel(getCheckFileDependenciesFunctions(), nextStep);
        }
    ], callback);
    function getCheckBinaryDependenciesFunctions() {
        return deps.binaries.map(binaryDependency => {
            return function (insideParallelNextStep) {
                const execCommand = `which ${binaryDependency}`;
                child_process_1.exec(execCommand, (err, stdout, stderr) => {
                    if (err)
                        return insideParallelNextStep(err);
                    if (stdout === '')
                        return insideParallelNextStep(`"${execCommand}" returned no valid binary`);
                    return insideParallelNextStep(null);
                });
            };
        });
    }
    function getCheckFileDependenciesFunctions() {
        return deps.files.map(file => {
            return function (insideParallelNextStep) {
                fs_1.default.exists(file, (exists) => {
                    if (!exists)
                        return insideParallelNextStep(`file ${file} does not exist`);
                    return insideParallelNextStep(null);
                });
            };
        });
    }
}
exports.default = checkDependencies;
//# sourceMappingURL=DependencyManager.js.map