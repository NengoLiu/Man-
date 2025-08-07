"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniPrePlugin = void 0;
const path_1 = __importDefault(require("path"));
const debug_1 = __importDefault(require("debug"));
const pluginutils_1 = require("@rollup/pluginutils");
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const debugPreJs = debug_1.default('vite:uni:pre-js');
const debugPreHtml = debug_1.default('vite:uni:pre-html');
const debugPreJsTry = debug_1.default('vite:uni:pre-js-try');
const PRE_JS_EXTNAME = ['.json', '.css'].concat(uni_cli_shared_1.EXTNAME_VUE).concat(uni_cli_shared_1.EXTNAME_JS);
const PRE_HTML_EXTNAME = uni_cli_shared_1.EXTNAME_VUE;
function uniPrePlugin(options) {
    const filter = pluginutils_1.createFilter(options.include, options.exclude);
    return {
        name: 'vite:uni-pre',
        transform(code, id) {
            if (!filter(id)) {
                return code;
            }
            const { filename, query } = uni_cli_shared_1.parseVueRequest(id);
            if (query.vue && query.type !== 'template') {
                return code;
            }
            const extname = path_1.default.extname(filename);
            const isHtml = query.type === 'template' || PRE_HTML_EXTNAME.includes(extname);
            const isJs = PRE_JS_EXTNAME.includes(extname);
            const isPre = isHtml || isJs;
            if (isPre) {
                debugPreJsTry(id);
            }
            const hasEndif = isPre && code.includes('#endif');
            if (isHtml && hasEndif) {
                code = uni_cli_shared_1.preHtml(code);
                debugPreHtml(id);
            }
            if (isJs && hasEndif) {
                code = uni_cli_shared_1.preJs(code);
                debugPreJs(id);
            }
            // https://github.com/vitejs/vite/blob/bc35fe994d48b2bd7076474f4a1a7b8ae5e8f401/packages/vite/src/node/server/sourcemap.ts#L15
            // 读取sourcemap时，需要移除?mpType=page等参数，否则读取不到提示文件不存在
            const map = this.getCombinedSourcemap();
            if (map) {
                map.sources = map.sources.map((source) => uni_cli_shared_1.parseVueRequest(source).filename);
            }
            return {
                code,
                map,
            };
        },
    };
}
exports.uniPrePlugin = uniPrePlugin;
