"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSSRServer = exports.createServer = void 0;
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const vite_1 = require("vite");
const express_1 = __importDefault(require("express"));
const shared_1 = require("@vue/shared");
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const utils_1 = require("./utils");
async function createServer(options) {
    const server = await vite_1.createServer({
        root: process.env.VITE_ROOT_DIR,
        logLevel: options.logLevel,
        clearScreen: options.clearScreen,
        server: utils_1.cleanOptions(options),
    });
    await server.listen();
}
exports.createServer = createServer;
async function createSSRServer(options) {
    const app = express_1.default();
    /**
     * @type {import('vite').ViteDevServer}
     */
    const vite = await vite_1.createServer({
        root: process.env.VITE_ROOT_DIR,
        logLevel: options.logLevel,
        clearScreen: options.clearScreen,
        server: {
            middlewareMode: true,
            watch: {
                // During tests we edit the files too fast and sometimes chokidar
                // misses change events, so enforce polling for consistency
                usePolling: true,
                interval: 100,
            },
        },
    });
    // use vite's connect instance as middleware
    app.use(vite.middlewares);
    app.use('*', async (req, res) => {
        try {
            const { h5 } = uni_cli_shared_1.parseManifestJson(process.env.UNI_INPUT_DIR);
            const base = (h5 && h5.router && h5.router.base) || '';
            const url = req.originalUrl.replace(base, '');
            const template = await vite.transformIndexHtml(url, fs_1.default.readFileSync(path_1.default.resolve(process.env.VITE_ROOT_DIR, 'index.html'), 'utf-8'));
            const render = (await vite.ssrLoadModule(path_1.default.resolve(process.env.UNI_INPUT_DIR, 'entry-server.js'))).render;
            const [appHtml, preloadLinks, appContext] = await render(url);
            const html = template
                .replace(`<!--preload-links-->`, preloadLinks)
                .replace(`<!--app-html-->`, appHtml)
                .replace(`<!--app-context-->`, appContext);
            res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
        }
        catch (e) {
            vite && vite.ssrFixStacktrace(e);
            res.status(500).end(e.stack);
        }
    });
    const logger = vite_1.createLogger(options.logLevel);
    const serverOptions = vite.config.server || {};
    const protocol = (shared_1.hasOwn(options, 'https') ? options.https : serverOptions.https)
        ? 'https'
        : 'http';
    let port = options.port || serverOptions.port || 3000;
    let hostname;
    if (options.host === undefined || options.host === 'localhost') {
        // Use a secure default
        hostname = '127.0.0.1';
    }
    else if (options.host === true) {
        // probably passed --host in the CLI, without arguments
        hostname = undefined; // undefined typically means 0.0.0.0 or :: (listen on all IPs)
    }
    else {
        hostname = options.host;
    }
    return new Promise((resolve, reject) => {
        const onSuccess = () => {
            const interfaces = os_1.default.networkInterfaces();
            Object.keys(interfaces).forEach((key) => (interfaces[key] || [])
                .filter((details) => details.family === 'IPv4')
                .map((detail) => {
                return {
                    type: detail.address.includes('127.0.0.1')
                        ? 'Local:   '
                        : 'Network: ',
                    host: detail.address,
                };
            })
                .forEach(({ type, host }) => {
                const url = `${protocol}://${host}:${chalk_1.default.bold(port)}${vite.config.base}`;
                logger.info(`  > ${type} ${chalk_1.default.cyan(url)}`);
            }));
            resolve(server);
        };
        const onError = (e) => {
            if (e.code === 'EADDRINUSE') {
                if (options.strictPort) {
                    server.off('error', onError);
                    reject(new Error(`Port ${port} is already in use`));
                }
                else {
                    logger.info(`Port ${port} is in use, trying another one...`);
                    app.listen(++port, hostname, onSuccess);
                }
            }
            else {
                server.off('error', onError);
                reject(e);
            }
        };
        const server = app.listen(port, hostname, onSuccess).on('error', onError);
    });
}
exports.createSSRServer = createSSRServer;
