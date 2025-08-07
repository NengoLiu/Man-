"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniCssScopedPlugin = void 0;
const path_1 = __importDefault(require("path"));
const debug_1 = __importDefault(require("debug"));
const pluginutils_1 = require("@rollup/pluginutils");
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const debugScoped = debug_1.default('vite:uni:scoped');
const SCOPED_RE = /<style\s[^>]*scoped[^>]*>/i;
function addScoped(code) {
    if (SCOPED_RE.test(code)) {
        return code;
    }
    return code.replace(/(<style\b[^><]*)>/gi, '$1 scoped>');
}
function uniCssScopedPlugin(options) {
    const filter = pluginutils_1.createFilter(options.include, options.exclude);
    return {
        name: 'vite:uni-scoped',
        transform(code, id) {
            if (!filter(id)) {
                return code;
            }
            const { filename, query } = uni_cli_shared_1.parseVueRequest(id);
            if (query.vue) {
                return code;
            }
            if (uni_cli_shared_1.EXTNAME_VUE.includes(path_1.default.extname(filename))) {
                debugScoped(id);
                return {
                    code: addScoped(code),
                    map: this.getCombinedSourcemap(),
                };
            }
        },
        handleHotUpdate(ctx) {
            if (!uni_cli_shared_1.EXTNAME_VUE.includes(path_1.default.extname(ctx.file))) {
                return;
            }
            debugScoped('hmr', ctx.file);
            const oldRead = ctx.read;
            ctx.read = async () => {
                const code = await oldRead();
                return addScoped(code);
            };
        },
    };
}
exports.uniCssScopedPlugin = uniCssScopedPlugin;
