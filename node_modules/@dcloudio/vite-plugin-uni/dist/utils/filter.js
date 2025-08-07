"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPublicFileFilter = void 0;
const path_1 = __importDefault(require("path"));
const slash_1 = __importDefault(require("slash"));
const pluginutils_1 = require("@rollup/pluginutils");
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
function createPublicFileFilter(base = '/') {
    const publicDir = slash_1.default(path_1.default.join(base, uni_cli_shared_1.PUBLIC_DIR + '/**/*'));
    const uniModulesDir = slash_1.default(path_1.default.join(base, 'uni_modules/*/' + uni_cli_shared_1.PUBLIC_DIR + '/**/*'));
    return pluginutils_1.createFilter([publicDir, uniModulesDir]);
}
exports.createPublicFileFilter = createPublicFileFilter;
