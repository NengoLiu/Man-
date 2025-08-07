"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniSSRPlugin = void 0;
const path_1 = __importDefault(require("path"));
const debug_1 = __importDefault(require("debug"));
const crypto_1 = __importDefault(require("crypto"));
const estree_walker_1 = require("estree-walker");
const pluginutils_1 = require("@rollup/pluginutils");
const compiler_sfc_1 = require("@vue/compiler-sfc");
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const utils_1 = require("../../utils");
const debugSSR = debug_1.default('vite:uni:ssr');
const KEYED_FUNC_RE = /(ssrRef|shallowSsrRef)/;
const ENTRY_SERVER_JS = 'entry-server.js';
function uniSSRPlugin(config, options) {
    const filter = pluginutils_1.createFilter(options.include, options.exclude);
    const entryServerJs = path_1.default.join(options.inputDir, ENTRY_SERVER_JS);
    const entryServerJsCode = utils_1.generateSsrEntryServerCode();
    return {
        name: 'vite:uni-ssr',
        resolveId(id) {
            if (id.endsWith(ENTRY_SERVER_JS)) {
                return entryServerJs;
            }
        },
        load(id) {
            if (id.endsWith(ENTRY_SERVER_JS)) {
                return entryServerJsCode;
            }
        },
        transform(code, id) {
            if (!filter(id))
                return null;
            if (!KEYED_FUNC_RE.test(code)) {
                return code;
            }
            debugSSR('try', id);
            const ast = this.parse(code);
            const s = new compiler_sfc_1.MagicString(code);
            estree_walker_1.walk(ast, {
                enter(node) {
                    if (!utils_1.isCallExpression(node)) {
                        return;
                    }
                    const { callee, arguments: args } = node;
                    if (args.length !== 1) {
                        return;
                    }
                    const name = utils_1.isIdentifier(callee)
                        ? callee.name
                        : utils_1.isMemberExpression(callee) && utils_1.isIdentifier(callee.property)
                            ? callee.property.name
                            : '';
                    if (name !== 'ssrRef' && name !== 'shallowSsrRef') {
                        return;
                    }
                    const { end } = node;
                    const key = id + '-' + node.end;
                    debugSSR(key, name);
                    s.appendLeft(end - 1, ", '" + createKey(`${id}-${end}`) + "'");
                },
            });
            return {
                code: s.toString(),
                map: s.generateMap().toString(),
            };
        },
        generateBundle(_options, bundle) {
            const chunk = bundle['entry-server.js'];
            if (chunk) {
                chunk.code =
                    utils_1.generateSsrDefineCode(config, uni_cli_shared_1.parseRpx2UnitOnce(options.inputDir)) +
                        '\n' +
                        chunk.code;
            }
        },
    };
}
exports.uniSSRPlugin = uniSSRPlugin;
function createKey(source) {
    const hash = crypto_1.default.createHash('md5');
    hash.update(source);
    return hash.digest('base64').toString();
}
