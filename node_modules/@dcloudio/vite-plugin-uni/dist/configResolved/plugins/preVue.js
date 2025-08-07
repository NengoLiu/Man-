"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeWxsCode = exports.normalizeBlockCode = exports.uniPreVuePlugin = void 0;
const path_1 = __importDefault(require("path"));
const debug_1 = __importDefault(require("debug"));
const compiler_sfc_1 = require("@vue/compiler-sfc");
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const utils_1 = require("../../utils");
const debugPreVue = debug_1.default('vite:uni:pre-vue');
const BLOCK_RE = /<\/block>/;
const WXS_LANG_RE = /lang=["|'](renderjs|wxs)["|']/;
const WXS_ATTRS = ['wxs', 'renderjs'];
const sourceToSFC = new Map();
function uniPreVuePlugin() {
    return {
        name: 'vite:uni-pre-vue',
        transform(code, id) {
            const { filename, query } = uni_cli_shared_1.parseVueRequest(id);
            if (query.vue) {
                return;
            }
            if (!uni_cli_shared_1.EXTNAME_VUE.includes(path_1.default.extname(filename))) {
                return;
            }
            const sourceKey = code + filename;
            const cache = sourceToSFC.get(sourceKey);
            if (cache) {
                debugPreVue('cache', id);
                return cache;
            }
            const hasBlock = BLOCK_RE.test(code);
            const hasWxs = WXS_LANG_RE.test(code);
            if (!hasBlock && !hasWxs) {
                return;
            }
            debugPreVue(id);
            const errors = [];
            const ast = utils_1.parseVue(code, errors);
            if (hasBlock) {
                code = normalizeBlockCode(ast, code);
            }
            if (hasWxs) {
                code = normalizeWxsCode(ast, code);
            }
            if (errors.length) {
                this.error(errors.join('\n'));
            }
            sourceToSFC.set(sourceKey, code);
            return code; // 暂不提供sourcemap,意义不大
        },
    };
}
exports.uniPreVuePlugin = uniPreVuePlugin;
function traverseChildren({ children }, blockNodes) {
    children.forEach((node) => traverseNode(node, blockNodes));
}
function traverseNode(node, blockNodes) {
    if (utils_1.isElementNode(node) && node.tag === 'block') {
        blockNodes.push(node);
    }
    if (node.type === 10 /* IF_BRANCH */ ||
        node.type === 11 /* FOR */ ||
        node.type === 1 /* ELEMENT */ ||
        node.type === 0 /* ROOT */) {
        traverseChildren(node, blockNodes);
    }
}
function normalizeBlockCode(ast, code) {
    const blockNodes = [];
    traverseNode(ast, blockNodes);
    if (blockNodes.length) {
        return normalizeBlockNode(code, blockNodes);
    }
    return code;
}
exports.normalizeBlockCode = normalizeBlockCode;
const BLOCK_END_LEN = '</block>'.length;
const BLOCK_START_LEN = '<block'.length;
function normalizeBlockNode(code, blocks) {
    const magicString = new compiler_sfc_1.MagicString(code);
    blocks.forEach(({ loc }) => {
        const startOffset = loc.start.offset;
        const endOffset = loc.end.offset;
        magicString.overwrite(startOffset, startOffset + BLOCK_START_LEN, '<template');
        magicString.overwrite(endOffset - BLOCK_END_LEN, endOffset, '</template>');
    });
    return magicString.toString();
}
function normalizeWxsCode(ast, code) {
    const wxsNode = ast.children.find((node) => node.type === 1 /* ELEMENT */ &&
        node.tag === 'script' &&
        node.props.find((prop) => prop.name === 'lang' &&
            prop.type === 6 /* ATTRIBUTE */ &&
            prop.value &&
            WXS_ATTRS.includes(prop.value.content)));
    if (wxsNode) {
        code = normalizeWxsNode(code, wxsNode);
    }
    return code;
}
exports.normalizeWxsCode = normalizeWxsCode;
const SCRIPT_END_LEN = '</script>'.length;
const SCRIPT_START_LEN = '<script'.length;
function normalizeWxsNode(code, { loc, props }) {
    const magicString = new compiler_sfc_1.MagicString(code);
    const langAttr = props.find((prop) => prop.name === 'lang');
    const moduleAttr = props.find((prop) => prop.name === 'module');
    const startOffset = loc.start.offset;
    const endOffset = loc.end.offset;
    const lang = langAttr.value.content;
    const langStartOffset = langAttr.loc.start.offset;
    magicString.overwrite(startOffset, startOffset + SCRIPT_START_LEN, '<' + lang); // <renderjs or <wxs
    magicString.overwrite(langStartOffset, langStartOffset + ('lang="' + lang + '"').length, ''); // remove lang="renderjs" or lang="wxs"
    magicString.overwrite(endOffset - SCRIPT_END_LEN, endOffset, '</' + lang + '>'); //</renderjs> or </wxs>
    if (moduleAttr) {
        const moduleStartOffset = moduleAttr.loc.start.offset;
        magicString.overwrite(moduleStartOffset, moduleStartOffset + 'module'.length, 'name'); // module="echarts" => name="echarts"
    }
    return magicString.toString();
}
