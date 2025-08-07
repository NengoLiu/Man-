"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serveStatic = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const debug_1 = __importDefault(require("debug"));
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const static_1 = require("./middlewares/static");
const utils_1 = require("../utils");
const debugStatic = debug_1.default('vite:uni:static');
/**
 * devServer时提供static等目录的静态资源服务
 * @param server
 * @param param
 */
const serveStatic = (server, { inputDir }) => {
    const filter = utils_1.createPublicFileFilter();
    const serve = static_1.uniStaticMiddleware({
        etag: true,
        resolve(pathname) {
            if (!filter(pathname)) {
                return;
            }
            const filename = path_1.default.join(inputDir, pathname);
            if (fs_1.default.existsSync(filename)) {
                debugStatic(filename, 'success');
                return filename;
            }
            else {
                debugStatic(filename, 'fail');
            }
        },
    });
    server.middlewares.use((req, res, next) => {
        // skip import request
        if (uni_cli_shared_1.isImportRequest(req.url)) {
            return next();
        }
        return serve(req, res, next);
    });
};
exports.serveStatic = serveStatic;
