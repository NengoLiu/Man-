"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniPageVuePlugin = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const slash_1 = __importDefault(require("slash"));
const debug_1 = __importDefault(require("debug"));
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const debugPageVue = debug_1.default('vite:uni:page-vue');
function uniPageVuePlugin(options) {
    const appVuePath = slash_1.default(path_1.default.resolve(options.inputDir, 'App.vue'));
    return {
        name: 'vite:uni-page-vue',
        load(id) {
            if (options.command === 'build') {
                const { filename, query } = uni_cli_shared_1.parseVueRequest(id);
                if (query.mpType === 'page') {
                    return fs_1.default.readFileSync(filename, 'utf8');
                }
            }
        },
        transform(code, id) {
            const { filename, query } = uni_cli_shared_1.parseVueRequest(id);
            if (filename === appVuePath && !query.vue) {
                debugPageVue(filename);
                return (code +
                    `;import {setupApp} from '@dcloudio/uni-h5';setupApp(_sfc_main);`);
            }
            if (query.mpType === 'page') {
                debugPageVue(filename);
                return (code +
                    `;import {setupPage} from '@dcloudio/uni-h5';setupPage(_sfc_main);`);
            }
        },
    };
}
exports.uniPageVuePlugin = uniPageVuePlugin;
