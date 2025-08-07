"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBuild = void 0;
const path_1 = __importDefault(require("path"));
const slash_1 = __importDefault(require("slash"));
const utils_1 = require("../utils");
function createBuild(options) {
    utils_1.initEasycomsOnce(options.inputDir, options.platform);
    return {
        rollupOptions: {
            output: {
                chunkFileNames(chunkInfo) {
                    if (chunkInfo.facadeModuleId) {
                        const dirname = path_1.default.relative(options.inputDir, path_1.default.dirname(chunkInfo.facadeModuleId));
                        if (dirname) {
                            return `${options.assetsDir}/${slash_1.default(dirname).replace(/\//g, '-')}-[name].[hash].js`;
                        }
                    }
                    return '[name].[hash].js';
                },
            },
        },
    };
}
exports.createBuild = createBuild;
