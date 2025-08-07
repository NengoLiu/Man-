"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initPlugins = void 0;
const debug_1 = __importDefault(require("debug"));
const shared_1 = require("@vue/shared");
const plugin_vue_1 = __importDefault(require("@vitejs/plugin-vue"));
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const pre_1 = require("./pre");
const json_1 = require("./json");
const preCss_1 = require("./preCss");
const easycom_1 = require("./easycom");
const inject_1 = require("./inject");
const mainJs_1 = require("./mainJs");
const pagesJson_1 = require("./pagesJson");
const manifestJson_1 = require("./manifestJson");
const pageVue_1 = require("./pageVue");
const copy_1 = require("./copy");
const static_1 = require("./static");
const cssScoped_1 = require("./cssScoped");
const renderjs_1 = require("./renderjs");
const preVue_1 = require("./preVue");
const ssr_1 = require("./ssr");
const resolveId_1 = require("./resolveId");
const debugPlugin = debug_1.default('vite:uni:plugin');
const UNI_H5_RE = /@dcloudio\/uni-h5/;
const COMMON_EXCLUDE = [
    /pages\.json\.js$/,
    /manifest\.json\.js$/,
    /vite\//,
    /\/@vue\//,
    /\/vue-router\//,
    /\/vuex\//,
    /@dcloudio\/uni-h5-vue/,
    /@dcloudio\/uni-shared/,
    /@dcloudio\/uni-components\/style/,
];
const APP_VUE_RE = /App.vue$/;
const uniCssScopedPluginOptions = {
    exclude: [APP_VUE_RE],
};
const uniPrePluginOptions = {
    exclude: [...COMMON_EXCLUDE, UNI_H5_RE],
};
const uniPreCssPluginOptions = {
    exclude: [UNI_H5_RE],
};
const uniEasycomPluginOptions = {
    exclude: [APP_VUE_RE, UNI_H5_RE],
};
const uniInjectPluginOptions = {
    exclude: [...COMMON_EXCLUDE],
    'uni.': '@dcloudio/uni-h5',
    getApp: ['@dcloudio/uni-h5', 'getApp'],
    getCurrentPages: ['@dcloudio/uni-h5', 'getCurrentPages'],
    UniServiceJSBridge: ['@dcloudio/uni-h5', 'UniServiceJSBridge'],
    UniViewJSBridge: ['@dcloudio/uni-h5', 'UniViewJSBridge'],
    callback(imports, mod) {
        const styles = mod[0] === '@dcloudio/uni-h5' &&
            uni_cli_shared_1.API_DEPS_CSS[mod[1]];
        if (!styles) {
            return;
        }
        styles.forEach((style) => {
            if (!imports.has(style)) {
                imports.set(style, `import '${style}';`);
            }
        });
    },
};
function initPlugins(config, options) {
    const command = config.command;
    const plugins = config.plugins;
    addPlugin(plugins, plugin_vue_1.default(options.vueOptions), 'vite:uni', 'pre');
    addPlugin(plugins, resolveId_1.uniResolveIdPlugin(options), 'vite:resolve', 'pre');
    if (options.platform === 'h5') {
        // h5平台需要为非App.vue组件自动增加scoped
        addPlugin(plugins, cssScoped_1.uniCssScopedPlugin(shared_1.extend(uniCssScopedPluginOptions, options)), 0, 'pre');
    }
    addPlugin(plugins, pre_1.uniPrePlugin(shared_1.extend(uniPrePluginOptions, options)), 0, 'pre');
    addPlugin(plugins, mainJs_1.uniMainJsPlugin(config, options), 1, 'pre');
    addPlugin(plugins, pagesJson_1.uniPagesJsonPlugin(config, options), 1, 'pre');
    addPlugin(plugins, manifestJson_1.uniManifestJsonPlugin(config, options), 1, 'pre');
    addPlugin(plugins, preCss_1.uniPreCssPlugin(shared_1.extend(uniPreCssPluginOptions, options)), 'vite:css');
    addPlugin(plugins, preVue_1.uniPreVuePlugin(), 'vite:vue', 'pre');
    addPlugin(plugins, renderjs_1.uniRenderjsPlugin(), 'vite:vue');
    // 可以考虑使用apply:'build'
    if (command === 'build') {
        addPlugin(plugins, inject_1.uniInjectPlugin(uniInjectPluginOptions), 'vite:vue');
    }
    addPlugin(plugins, ssr_1.uniSSRPlugin(config, shared_1.extend({ exclude: [...COMMON_EXCLUDE] }, options)), 'vite:vue');
    addPlugin(plugins, easycom_1.uniEasycomPlugin(shared_1.extend(uniEasycomPluginOptions, options)), 'vite:vue');
    addPlugin(plugins, pageVue_1.uniPageVuePlugin(options), 'vite:vue');
    addPlugin(plugins, json_1.uniJsonPlugin(options), 'vite:json', 'pre');
    addPlugin(plugins, static_1.uniStaticPlugin(options, config), 'vite:asset', 'pre');
    if (command === 'build' && !config.build.ssr) {
        addPlugin(plugins, copy_1.uniCopyPlugin(options), plugins.length);
    }
    if (process.env.DEBUG) {
        debugPlugin(plugins.length);
        debugPlugin(plugins.map((p) => p.name));
    }
}
exports.initPlugins = initPlugins;
function addPlugin(plugins, plugin, index, type = 'post') {
    if (typeof index === 'string') {
        index = plugins.findIndex((plugin) => plugin.name === index);
    }
    return plugins.splice(index + (type === 'pre' ? 0 : 1), 0, plugin);
}
