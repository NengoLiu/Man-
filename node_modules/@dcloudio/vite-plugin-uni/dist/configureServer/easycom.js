"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serveEasycom = void 0;
const uni_shared_1 = require("@dcloudio/uni-shared");
const utils_1 = require("../utils");
const serveEasycom = (server, options) => {
    const { filter, refresh } = utils_1.initEasycomsOnce(options.inputDir, options.platform);
    const refreshEasycom = uni_shared_1.debounce(refresh, 100);
    server.watcher.on('all', (eventName, path) => {
        if (!['add', 'unlink'].includes(eventName)) {
            return;
        }
        utils_1.debugEasycom('watch', eventName, path);
        if (filter(path)) {
            refreshEasycom();
        }
    });
};
exports.serveEasycom = serveEasycom;
