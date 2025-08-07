"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniInjectPlugin = void 0;
const config_1 = require("./config");
const configResolved_1 = require("./configResolved");
const configureServer_1 = require("./configureServer");
const handleHotUpdate_1 = require("./handleHotUpdate");
const utils_1 = require("./utils");
__exportStar(require("./vue"), exports);
let createVueJsxPlugin;
try {
    createVueJsxPlugin = require('@vitejs/plugin-vue-jsx');
}
catch (e) { }
let createViteLegacyPlugin;
try {
    createViteLegacyPlugin = require('@vitejs/plugin-legacy');
}
catch (e) { }
function uniPlugin(rawOptions = {}) {
    const options = {
        ...rawOptions,
        base: '/',
        assetsDir: 'assets',
        inputDir: '',
        outputDir: '',
        command: 'serve',
        platform: 'h5',
    };
    const plugins = [];
    if (createViteLegacyPlugin && options.viteLegacyOptions !== false) {
        plugins.push(...createViteLegacyPlugin(options.viteLegacyOptions));
    }
    if (createVueJsxPlugin && options.vueJsxOptions !== false) {
        plugins.push(createVueJsxPlugin(options.vueJsxOptions));
    }
    plugins.push({
        name: 'vite:uni',
        config: config_1.createConfig(options),
        configResolved: configResolved_1.createConfigResolved(options),
        configureServer: configureServer_1.createConfigureServer(options),
        handleHotUpdate: handleHotUpdate_1.createHandleHotUpdate(options),
    });
    plugins.push(...utils_1.initExtraPlugins(process.env.UNI_CLI_CONTEXT || process.cwd(), process.env.UNI_PLATFORM || 'h5'));
    return plugins;
}
exports.default = uniPlugin;
var inject_1 = require("./configResolved/plugins/inject");
Object.defineProperty(exports, "uniInjectPlugin", { enumerable: true, get: function () { return inject_1.uniInjectPlugin; } });
