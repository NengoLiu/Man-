"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = void 0;
function createServer(_options) {
    return {
        host: true,
        watch: {
            ignored: ['**/uniCloud**'],
        },
    };
}
exports.createServer = createServer;
