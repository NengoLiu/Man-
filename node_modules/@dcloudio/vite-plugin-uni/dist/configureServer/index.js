"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConfigureServer = void 0;
const easycom_1 = require("./easycom");
const static_1 = require("./static");
function createConfigureServer(options) {
    return function (server) {
        options.devServer = server;
        easycom_1.serveEasycom(server, options);
        return () => {
            static_1.serveStatic(server, options);
        };
    };
}
exports.createConfigureServer = createConfigureServer;
