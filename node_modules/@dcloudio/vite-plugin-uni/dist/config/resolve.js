"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createResolve = void 0;
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
function createResolve(options, _config) {
    return {
        alias: {
            '@': options.inputDir,
            '~@': options.inputDir,
        },
        extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'].concat(uni_cli_shared_1.EXTNAME_VUE),
    };
}
exports.createResolve = createResolve;
