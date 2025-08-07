"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniMainJsPlugin = void 0;
const path_1 = __importDefault(require("path"));
const slash_1 = __importDefault(require("slash"));
const utils_1 = require("../../utils");
function uniMainJsPlugin(config, options) {
    const mainPath = slash_1.default(path_1.default.resolve(options.inputDir, 'main'));
    const mainJsPath = mainPath + '.js';
    const mainTsPath = mainPath + '.ts';
    const pagesJsonJsPath = slash_1.default(path_1.default.resolve(options.inputDir, 'pages.json.js'));
    const isSSR = utils_1.isSsr(config.command, config) || utils_1.isSsrManifest(config.command, config);
    return {
        name: 'vite:uni-main-js',
        transform(code, id, ssr) {
            if (id === mainJsPath || id === mainTsPath) {
                if (!isSSR) {
                    code = code.includes('createSSRApp')
                        ? createApp(code)
                        : createLegacyApp(code);
                }
                else {
                    code = ssr ? createSSRServerApp(code) : createSSRClientApp(code);
                }
                return {
                    code: `import { plugin } from '@dcloudio/uni-h5';import '${pagesJsonJsPath}';${code}`,
                    map: this.getCombinedSourcemap(),
                };
            }
        },
    };
}
exports.uniMainJsPlugin = uniMainJsPlugin;
function createApp(code) {
    return `createApp().app.use(plugin).mount("#app");${code.replace('createSSRApp', 'createVueApp as createSSRApp')}`;
}
function createLegacyApp(code) {
    return `function createApp(rootComponent,rootProps){return createVueApp(rootComponent, rootProps).use(plugin)};${code.replace('createApp', 'createVueApp')}`;
}
function createSSRClientApp(code) {
    return `import { UNI_SSR, UNI_SSR_STORE } from '@dcloudio/uni-shared';const { app, store } = createApp();app.use(plugin);store && window[UNI_SSR] && window[UNI_SSR][UNI_SSR_STORE] && store.replaceState(window[UNI_SSR][UNI_SSR_STORE]);app.router.isReady().then(() => app.mount("#app"));${code}`;
}
function createSSRServerApp(code) {
    return code;
}
