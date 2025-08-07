"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cac_1 = require("cac");
const chalk_1 = __importDefault(require("chalk"));
const vite_1 = require("vite");
const build_1 = require("./build");
const server_1 = require("./server");
const utils_1 = require("./utils");
const cli = cac_1.cac('uni');
cli
    .option('-p, --platform [platform]', '[string] ' + utils_1.PLATFORMS.join(' | '), {
    default: 'h5',
})
    .option('-ssr', '[boolean] server-side rendering', {
    default: false,
})
    .option('-l, --logLevel <level>', `[string] silent | error | warn | all`)
    .option('--clearScreen', `[boolean] allow/disable clear screen when logging`)
    .option('-d, --debug [feat]', `[string | boolean] show debug logs`)
    .option('-f, --filter <filter>', `[string] filter debug logs`);
cli
    .command('')
    .alias('dev')
    .option('--host [host]', `[string] specify hostname`)
    .option('--port <port>', `[number] specify port`)
    .option('--https', `[boolean] use TLS + HTTP/2`)
    .option('--open [path]', `[boolean | string] open browser on startup`)
    .option('--cors', `[boolean] enable CORS`)
    .option('--strictPort', `[boolean] exit if specified port is already in use`)
    .option('--force', `[boolean] force the optimizer to ignore the cache and re-bundle`)
    .action(async (options) => {
    utils_1.initEnv(options);
    try {
        await (options.ssr ? server_1.createSSRServer(options) : server_1.createServer(options));
    }
    catch (e) {
        vite_1.createLogger(options.logLevel).error(chalk_1.default.red(`error when starting dev server:\n${e.stack}`));
        process.exit(1);
    }
});
cli
    .command('build')
    .option('--outDir <dir>', `[string] output directory (default: dist)`)
    .option('--assetsInlineLimit <number>', `[number] static asset base64 inline threshold in bytes (default: 4096)`)
    .option('--sourcemap', `[boolean] output source maps for build (default: false)`)
    .option('--minify [minifier]', `[boolean | "terser" | "esbuild"] enable/disable minification, ` +
    `or specify minifier to use (default: terser)`)
    .option('--manifest', `[boolean] emit build manifest json`)
    .option('--ssrManifest', `[boolean] emit ssr manifest json`)
    .option('--emptyOutDir', `[boolean] force empty outDir when it's outside of root`)
    .option('-m, --mode <mode>', `[string] set env mode`)
    .option('-w, --watch', `[boolean] rebuilds when modules have changed on disk`)
    .action(async (options) => {
    utils_1.initEnv(options);
    try {
        await (options.ssr ? build_1.buildSSR(options) : build_1.build(options));
    }
    catch (e) {
        vite_1.createLogger(options.logLevel).error(chalk_1.default.red(`error during build:\n${e.stack}`));
        process.exit(1);
    }
});
cli.help();
cli.version(require('../../package.json').version);
cli.parse();
