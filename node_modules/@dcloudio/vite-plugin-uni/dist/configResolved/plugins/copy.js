"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniCopyPlugin = void 0;
const path_1 = __importDefault(require("path"));
const slash_1 = __importDefault(require("slash"));
const rollup_plugin_copy_1 = __importDefault(require("rollup-plugin-copy"));
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
function uniCopyPlugin({ inputDir, outputDir, }) {
    // TODO 多平台，如 h5,app 的 hybrid/html 目录
    return rollup_plugin_copy_1.default({
        targets: [
            {
                src: slash_1.default(path_1.default.resolve(inputDir, uni_cli_shared_1.PUBLIC_DIR)),
                dest: outputDir,
            },
            {
                src: slash_1.default(path_1.default.resolve(inputDir, 'uni_modules/*/' + uni_cli_shared_1.PUBLIC_DIR)),
                dest: outputDir,
                rename: (_name, _extension, fullPath) => {
                    return path_1.default.relative(inputDir, fullPath);
                },
            },
        ],
        hook: 'writeBundle',
        verbose: process.env.DEBUG ? true : false,
    });
}
exports.uniCopyPlugin = uniCopyPlugin;
