"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanOptions = exports.initEnv = exports.PLATFORMS = void 0;
const path_1 = __importDefault(require("path"));
exports.PLATFORMS = [
    'app',
    'h5',
    'mp-alipay',
    'mp-baidu',
    'mp-qq',
    'mp-toutiao',
    'mp-weixin',
    'quickapp-webview-huawei',
    'quickapp-webview-union',
];
function initEnv(options) {
    process.env.VITE_ROOT_DIR = process.env.UNI_INPUT_DIR || process.cwd();
    process.env.UNI_INPUT_DIR =
        process.env.UNI_INPUT_DIR || path_1.default.resolve(process.cwd(), 'src');
    process.env.UNI_OUTPUT_DIR =
        options.outDir ||
            process.env.UNI_OUTPUT_DIR ||
            path_1.default.resolve(process.cwd(), 'dist');
    process.env.UNI_PLATFORM = options.platform;
}
exports.initEnv = initEnv;
function cleanOptions(options) {
    const ret = { ...options };
    delete ret['--'];
    delete ret.platform;
    delete ret.p;
    delete ret.ssr;
    delete ret.debug;
    delete ret.d;
    delete ret.filter;
    delete ret.f;
    delete ret.logLevel;
    delete ret.l;
    delete ret.clearScreen;
    return ret;
}
exports.cleanOptions = cleanOptions;
