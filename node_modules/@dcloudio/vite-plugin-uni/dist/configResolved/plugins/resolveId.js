"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniResolveIdPlugin = void 0;
const path_1 = __importDefault(require("path"));
const debug_1 = __importDefault(require("debug"));
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const utils_1 = require("../../utils");
const debugResolve = debug_1.default('vite:uni:resolve');
function getModuleType(mode) {
    return mode === 2 ? 'es-compat' : 'es';
}
// ssr 时，服务端 vue 的映射目前由 package.json-"vue":"npm:@dcloudio/uni-h5-vue" 处理（TODO HBuilderX）
function uniResolveIdPlugin(options) {
    const resolveCache = {};
    const resolvedIds = [
        {
            test(id) {
                return id === '@dcloudio/uni-h5-vue';
            },
            resolveId(id) {
                const files = utils_1.BUILT_IN_MODULES[id];
                const { MODE } = uni_cli_shared_1.parseCompatConfigOnce(options.inputDir);
                return uni_cli_shared_1.resolveBuiltIn(path_1.default.join(id, files[getModuleType(MODE)]));
            },
        },
        {
            test(id) {
                return utils_1.BUILT_IN_MODULES[id];
            },
            resolveId(id) {
                return uni_cli_shared_1.resolveBuiltIn(path_1.default.join(id, utils_1.BUILT_IN_MODULES[id]['es']));
            },
        },
        {
            test(id) {
                return (id.startsWith('@dcloudio/uni-h5/style') ||
                    id.startsWith('@dcloudio/uni-components/style'));
            },
            resolveId(id) {
                return uni_cli_shared_1.resolveBuiltIn(id);
            },
        },
    ];
    return {
        name: 'vite:uni-resolve-id',
        resolveId(id) {
            if (id === 'vue') {
                if (options.platform === 'h5') {
                    id = '@dcloudio/uni-h5-vue';
                }
            }
            const cache = resolveCache[id];
            if (cache) {
                return cache;
            }
            for (const { test, resolveId } of resolvedIds) {
                if (!test(id)) {
                    continue;
                }
                const file = resolveId(id);
                if (!file) {
                    continue;
                }
                resolveCache[id] = file;
                debugResolve(id, file);
                return file;
            }
        },
    };
}
exports.uniResolveIdPlugin = uniResolveIdPlugin;
