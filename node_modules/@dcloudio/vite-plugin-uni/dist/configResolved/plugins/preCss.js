"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniPreCssPlugin = void 0;
const debug_1 = __importDefault(require("debug"));
const pluginutils_1 = require("@rollup/pluginutils");
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const debugPre = debug_1.default('vite:uni:pre-css');
const debugPreTry = debug_1.default('vite:uni:pre-css-try');
const cssLangs = `\\.(less|sass|scss|styl|stylus|postcss)($|\\?)`;
const cssLangRE = new RegExp(cssLangs);
/**
 * preprocess css
 * @param options
 */
function uniPreCssPlugin(options) {
    const filter = pluginutils_1.createFilter(options.include, options.exclude);
    return {
        name: 'vite:uni-pre-css',
        transform(code, id) {
            if (!filter(id)) {
                return code;
            }
            if (!cssLangRE.test(id)) {
                return;
            }
            debugPreTry(id);
            if (!code.includes('#endif')) {
                return;
            }
            debugPre(id);
            return uni_cli_shared_1.preJs(code);
        },
    };
}
exports.uniPreCssPlugin = uniPreCssPlugin;
