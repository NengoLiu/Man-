"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConfigResolved = void 0;
const env_1 = require("./env");
const logger_1 = require("./logger");
const config_1 = require("./config");
const options_1 = require("./options");
const plugins_1 = require("./plugins");
function createConfigResolved(options) {
    return ((config) => {
        env_1.initEnv(config);
        config_1.initConfig(config);
        options_1.initOptions(options, config);
        plugins_1.initPlugins(config, options);
        if (options.command === 'serve') {
            logger_1.initLogger(config);
        }
    });
}
exports.createConfigResolved = createConfigResolved;
