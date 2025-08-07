"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniRenderjsPlugin = void 0;
const debug_1 = __importDefault(require("debug"));
const compiler_sfc_1 = require("@vue/compiler-sfc");
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const debugRenderjs = debug_1.default('vite:uni:renderjs');
function uniRenderjsPlugin() {
    return {
        name: 'vite:uni-renderjs',
        transform(code, id) {
            const isWxs = /vue&type=wxs/.test(id);
            const isRenderjs = /vue&type=renderjs/.test(id);
            if (!isWxs && !isRenderjs) {
                return;
            }
            const type = isWxs ? 'wxs' : 'renderjs';
            const { query } = uni_cli_shared_1.parseVueRequest(id);
            debugRenderjs(id);
            const name = query.name;
            if (!name) {
                this.error(`<script module="missing module name" lang="${type}">
${code}
</script>`);
            }
            return `${compiler_sfc_1.rewriteDefault(code.replace(/module\.exports\s*=/, 'export default '), '_sfc_' + type)}
${type === 'renderjs' ? genRenderjsCode(name) : genWxsCode(name)}`;
        },
    };
}
exports.uniRenderjsPlugin = uniRenderjsPlugin;
function genRenderjsCode(name) {
    return `export default Comp => {
  if(!Comp.mixins){Comp.mixins = []}
  Comp.mixins.push({beforeCreate(){ this['${name}'] = this }})
  Comp.mixins.push(_sfc_renderjs)
}`;
}
function genWxsCode(name) {
    return `export default Comp => {
  if(!Comp.mixins){Comp.mixins = []}
  Comp.mixins.push({beforeCreate(){ this['${name}'] = _sfc_wxs }})
}`;
}
