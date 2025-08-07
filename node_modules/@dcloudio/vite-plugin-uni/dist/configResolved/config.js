"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initConfig = void 0;
const dist_1 = require("../../../uni-cli-shared/dist");
const utils_1 = require("../utils");
// import alias from 'module-alias'
function initConfig(config) {
    if (utils_1.isSsr(config.command, config)) {
        const { MODE } = dist_1.parseCompatConfigOnce(process.env.UNI_INPUT_DIR);
        utils_1.initSsrDefine(config);
        utils_1.rewriteSsrVue(MODE);
        utils_1.rewriteSsrResolve(MODE);
        utils_1.rewriteSsrNativeTag();
        utils_1.rewriteSsrRenderStyle(process.env.UNI_INPUT_DIR);
    }
    //   let ssr = (config as any).ssr as SSROptions
    //   if (!ssr) {
    //     ssr = {}
    //   }
    //   if (ssr.external) {
    //     const index = ssr.external.findIndex((name) => name === 'vue')
    //     if (index !== -1) {
    //       ssr.external.splice(index, 1)
    //     }
    //   }
    //   if (!ssr.noExternal) {
    //     ssr.noExternal = ['vue']
    //   } else if (!ssr.noExternal.includes('vue')) {
    //     ssr.noExternal.push('vue')
    //   }
}
exports.initConfig = initConfig;
