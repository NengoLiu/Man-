"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchEasycom = exports.initEasycomsOnce = exports.initEasycoms = exports.debugEasycom = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const debug_1 = __importDefault(require("debug"));
const slash_1 = __importDefault(require("slash"));
const pluginutils_1 = require("@rollup/pluginutils");
const uni_shared_1 = require("@dcloudio/uni-shared");
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
exports.debugEasycom = debug_1.default('vite:uni:easycom');
const easycoms = [];
const easycomsCache = new Map();
const easycomsInvalidCache = new Set();
let hasEasycom = false;
function clearEasycom() {
    easycoms.length = 0;
    easycomsCache.clear();
    easycomsInvalidCache.clear();
}
function initEasycoms(inputDir, platform) {
    const buildInComponentsDir = path_1.default.resolve(require.resolve('@dcloudio/uni-components'), '../lib');
    const componentsDir = path_1.default.resolve(inputDir, 'components');
    const uniModulesDir = path_1.default.resolve(inputDir, 'uni_modules');
    const initEasycomOptions = (pagesJson) => {
        // 初始化时，从once中读取缓存，refresh时，实时读取
        const { easycom } = pagesJson || uni_cli_shared_1.parsePagesJson(inputDir, platform, false);
        const easycomOptions = {
            dirs: easycom && easycom.autoscan === false
                ? [buildInComponentsDir] // 禁止自动扫描
                : [
                    buildInComponentsDir,
                    componentsDir,
                    ...initUniModulesEasycomDirs(uniModulesDir),
                ],
            rootDir: inputDir,
            autoscan: !!(easycom && easycom.autoscan),
            custom: (easycom && easycom.custom) || {},
        };
        exports.debugEasycom(easycomOptions);
        return easycomOptions;
    };
    const options = initEasycomOptions(uni_cli_shared_1.parsePagesJsonOnce(inputDir, platform));
    initEasycom(options);
    const res = {
        options,
        filter: pluginutils_1.createFilter(['components/*/*.vue', 'uni_modules/*/components/*/*.vue'], [], {
            resolve: inputDir,
        }),
        refresh() {
            res.options = initEasycomOptions();
            initEasycom(res.options);
        },
        easycoms,
    };
    return res;
}
exports.initEasycoms = initEasycoms;
exports.initEasycomsOnce = uni_shared_1.once(initEasycoms);
function initUniModulesEasycomDirs(uniModulesDir) {
    if (!fs_1.default.existsSync(uniModulesDir)) {
        return [];
    }
    return fs_1.default
        .readdirSync(uniModulesDir)
        .map((uniModuleDir) => {
        const uniModuleComponentsDir = path_1.default.resolve(uniModulesDir, uniModuleDir, 'components');
        if (fs_1.default.existsSync(uniModuleComponentsDir)) {
            return uniModuleComponentsDir;
        }
    })
        .filter(Boolean);
}
function initEasycom({ dirs, rootDir, custom, extensions = ['.vue'], }) {
    clearEasycom();
    const easycomsObj = Object.create(null);
    if (dirs && dirs.length && rootDir) {
        Object.assign(easycomsObj, initAutoScanEasycoms(dirs, rootDir, extensions));
    }
    if (custom) {
        Object.assign(easycomsObj, custom);
    }
    Object.keys(easycomsObj).forEach((name) => {
        easycoms.push({
            pattern: new RegExp(name),
            replacement: easycomsObj[name],
        });
    });
    exports.debugEasycom(easycoms);
    hasEasycom = !!easycoms.length;
    return easycoms;
}
function matchEasycom(tag) {
    if (!hasEasycom) {
        return;
    }
    let source = easycomsCache.get(tag);
    if (source) {
        return source;
    }
    if (easycomsInvalidCache.has(tag)) {
        return false;
    }
    const matcher = easycoms.find((matcher) => matcher.pattern.test(tag));
    if (!matcher) {
        easycomsInvalidCache.add(tag);
        return false;
    }
    source = tag.replace(matcher.pattern, matcher.replacement);
    easycomsCache.set(tag, source);
    exports.debugEasycom('matchEasycom', tag, source);
    return source;
}
exports.matchEasycom = matchEasycom;
const isDir = (path) => fs_1.default.lstatSync(path).isDirectory();
function initAutoScanEasycom(dir, rootDir, extensions) {
    if (!path_1.default.isAbsolute(dir)) {
        dir = path_1.default.resolve(rootDir, dir);
    }
    const easycoms = Object.create(null);
    if (!fs_1.default.existsSync(dir)) {
        return easycoms;
    }
    fs_1.default.readdirSync(dir).forEach((name) => {
        const folder = path_1.default.resolve(dir, name);
        if (!isDir(folder)) {
            return;
        }
        const importDir = slash_1.default(path_1.default.relative(rootDir, folder));
        const files = fs_1.default.readdirSync(folder);
        // 读取文件夹文件列表，比对文件名（fs.existsSync在大小写不敏感的系统会匹配不准确）
        for (let i = 0; i < extensions.length; i++) {
            const ext = extensions[i];
            if (files.includes(name + ext)) {
                easycoms[`^${name}$`] = `@/${importDir}/${name}${ext}`;
                break;
            }
        }
    });
    return easycoms;
}
function initAutoScanEasycoms(dirs, rootDir, extensions) {
    return dirs.reduce((easycoms, dir) => {
        const curEasycoms = initAutoScanEasycom(dir, rootDir, extensions);
        Object.keys(curEasycoms).forEach((name) => {
            // Use the first component when name conflict
            if (!easycoms[name]) {
                easycoms[name] = curEasycoms[name];
            }
        });
        return easycoms;
    }, Object.create(null));
}
