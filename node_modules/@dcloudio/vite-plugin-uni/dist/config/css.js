"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCss = void 0;
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
// import autoprefixer from 'autoprefixer'
const shared_1 = require("@vue/shared");
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const utils_1 = require("../utils");
function resolveAdditionalData(inputDir) {
    const uniScssFile = path_1.default.resolve(inputDir, 'uni.scss');
    if (!fs_extra_1.default.existsSync(uniScssFile)) {
        return '';
    }
    return fs_extra_1.default.readFileSync(uniScssFile, 'utf8');
}
function createCss(options) {
    return {
        postcss: {
            plugins: [
                utils_1.uniapp(shared_1.extend({ page: options.platform === 'h5' ? 'uni-page-body' : 'body' }, uni_cli_shared_1.parseRpx2UnitOnce(options.inputDir))),
            ],
        },
        preprocessorOptions: {
            scss: {
                additionalData: resolveAdditionalData(options.inputDir),
            },
        },
    };
}
exports.createCss = createCss;
