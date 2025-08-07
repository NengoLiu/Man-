"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initExtraPlugins = void 0;
const shared_1 = require("@vue/shared");
const path_1 = __importDefault(require("path"));
function initExtraPlugins(cliRoot, platform) {
    return initPlugins(resolvePlugins(cliRoot, platform));
}
exports.initExtraPlugins = initExtraPlugins;
function initPlugin(plugin) {
    const configFile = path_1.default.join(plugin.id, plugin.config.main || '/lib/uni.plugin.js');
    try {
        return require(configFile);
    }
    catch (e) {
        console.warn(`${configFile} not found`);
    }
}
function initPlugins(plugins) {
    return plugins
        .map((plugin) => initPlugin(plugin))
        .filter(Boolean);
}
function resolvePlugins(cliRoot, platform) {
    const pkg = require(path_1.default.join(cliRoot, 'package.json'));
    return Object.keys(pkg.devDependencies || {})
        .concat(Object.keys(pkg.dependencies || {}))
        .map((id) => {
        try {
            const pluginPkg = require(id + '/package.json');
            const config = pluginPkg['uni-app'];
            if (!config || !config.name) {
                return;
            }
            const { apply } = config;
            if (shared_1.isArray(apply)) {
                if (!apply.includes(platform)) {
                    return;
                }
            }
            else if (shared_1.isString(apply)) {
                if (apply !== platform) {
                    return;
                }
            }
            return {
                id,
                name: config.name,
                config,
            };
        }
        catch (e) { }
    })
        .filter(Boolean);
}
