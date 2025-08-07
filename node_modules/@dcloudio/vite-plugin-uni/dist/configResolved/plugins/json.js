"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniJsonPlugin = void 0;
const path_1 = __importDefault(require("path"));
const slash_1 = __importDefault(require("slash"));
const jsonc_parser_1 = require("jsonc-parser");
function uniJsonPlugin(options) {
    const pagesJsonPath = slash_1.default(path_1.default.resolve(options.inputDir, 'pages.json'));
    const manifestJsonPath = slash_1.default(path_1.default.resolve(options.inputDir, 'manifest.json'));
    return {
        name: 'vite:uni-json',
        transform(code, id) {
            if ((id.startsWith(pagesJsonPath) || id.startsWith(manifestJsonPath)) &&
                !id.endsWith('.json.js')) {
                code = JSON.stringify(jsonc_parser_1.parse(code));
            }
            return code;
        },
    };
}
exports.uniJsonPlugin = uniJsonPlugin;
