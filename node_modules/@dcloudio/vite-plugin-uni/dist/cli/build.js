"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSSR = exports.build = void 0;
const path_1 = __importDefault(require("path"));
const vite_1 = require("vite");
const utils_1 = require("./utils");
async function build(options) {
    await vite_1.build({
        root: process.env.VITE_ROOT_DIR,
        logLevel: options.logLevel,
        clearScreen: options.clearScreen,
        build: utils_1.cleanOptions(options),
    });
}
exports.build = build;
async function buildSSR(options) {
    const outputDir = process.env.UNI_OUTPUT_DIR;
    process.env.UNI_OUTPUT_DIR = path_1.default.resolve(outputDir, 'client');
    const ssrBuildClientOptions = utils_1.cleanOptions(options);
    ssrBuildClientOptions.ssrManifest = true;
    ssrBuildClientOptions.outDir = process.env.UNI_OUTPUT_DIR;
    await vite_1.build({
        root: process.env.VITE_ROOT_DIR,
        logLevel: options.logLevel,
        clearScreen: options.clearScreen,
        build: ssrBuildClientOptions,
    });
    process.env.UNI_OUTPUT_DIR = path_1.default.resolve(outputDir, 'server');
    const ssrBuildServerOptions = utils_1.cleanOptions(options);
    ssrBuildServerOptions.ssr = path_1.default.resolve(process.env.UNI_INPUT_DIR, 'entry-server.js');
    ssrBuildServerOptions.outDir = process.env.UNI_OUTPUT_DIR;
    await vite_1.build({
        root: process.env.VITE_ROOT_DIR,
        logLevel: options.logLevel,
        clearScreen: options.clearScreen,
        build: ssrBuildServerOptions,
    });
}
exports.buildSSR = buildSSR;
