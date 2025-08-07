"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConfig = void 0;
const path_1 = __importDefault(require("path"));
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const css_1 = require("./css");
const resolve_1 = require("./resolve");
const server_1 = require("./server");
const build_1 = require("./build");
const optimizeDeps_1 = require("./optimizeDeps");
const define_1 = require("./define");
const vue_1 = require("../vue");
function normalizeRoot(config) {
    return uni_cli_shared_1.normalizePath(config.root ? path_1.default.resolve(config.root) : process.cwd());
}
function normalizeInputDir(config) {
    return process.env.UNI_INPUT_DIR || path_1.default.resolve(normalizeRoot(config), 'src');
}
function createConfig(options) {
    return (config, env) => {
        options.command = env.command;
        options.platform = process.env.UNI_PLATFORM || 'h5';
        options.inputDir = normalizeInputDir(config);
        let base = config.base;
        if (!base) {
            const { h5 } = uni_cli_shared_1.parseManifestJsonOnce(options.inputDir);
            base = (h5 && h5.router && h5.router.base) || '';
        }
        if (!base) {
            base = '/';
        }
        options.base = base;
        options.vueOptions = vue_1.initPluginVueOptions(options);
        options.vueJsxOptions = vue_1.initPluginVueJsxOptions(options);
        options.viteLegacyOptions = vue_1.initPluginViteLegacyOptions(options);
        const define = define_1.createDefine(options, config, env);
        return {
            base,
            publicDir: config.publicDir || false,
            define,
            resolve: resolve_1.createResolve(options, config),
            optimizeDeps: optimizeDeps_1.createOptimizeDeps(options),
            server: server_1.createServer(options),
            build: build_1.createBuild(options),
            css: css_1.createCss(options),
        };
    };
}
exports.createConfig = createConfig;
