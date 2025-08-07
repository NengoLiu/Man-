"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniapp = void 0;
const shared_1 = require("@vue/shared");
const postcss_1 = require("postcss");
const postcss_selector_parser_1 = __importDefault(require("postcss-selector-parser"));
const uni_shared_1 = require("@dcloudio/uni-shared");
const defaultUniAppCssProcessorOptions = shared_1.extend({
    page: 'body',
}, uni_shared_1.defaultRpx2Unit);
const BG_PROPS = [
    'background',
    'background-clip',
    'background-color',
    'background-image',
    'background-origin',
    'background-position',
    'background-repeat',
    'background-size',
    'background-attachment',
];
function transform(selector, page, state) {
    if (selector.type !== 'tag') {
        return;
    }
    const { value } = selector;
    if (uni_shared_1.isBuiltInComponent(value)) {
        selector.value = uni_shared_1.COMPONENT_SELECTOR_PREFIX + value;
    }
    else if (value === 'page') {
        if (!page) {
            return;
        }
        selector.value = page;
        if (page !== 'body') {
            state.bg = true;
        }
    }
}
function createBodyBackgroundRule(origRule) {
    const bgDecls = [];
    origRule.walkDecls((decl) => {
        if (BG_PROPS.indexOf(decl.prop) !== -1) {
            bgDecls.push(decl.clone());
        }
    });
    if (bgDecls.length) {
        origRule.after(postcss_1.rule({ selector: 'body' }).append(bgDecls));
    }
}
function walkRules(page) {
    return (rule) => {
        const state = { bg: false };
        rule.selector = postcss_selector_parser_1.default((selectors) => selectors.walk((selector) => transform(selector, page, state))).processSync(rule.selector);
        state.bg && createBodyBackgroundRule(rule);
    };
}
function walkDecls(rpx2unit) {
    return (decl) => {
        const { value } = decl;
        if (value.indexOf('rpx') === -1 && value.indexOf('upx') === -1) {
            return;
        }
        decl.value = rpx2unit(decl.value);
    };
}
const uniapp = (opts) => {
    const { page, unit, unitRatio, unitPrecision } = shared_1.extend({}, defaultUniAppCssProcessorOptions, opts || {});
    const rpx2unit = uni_shared_1.createRpx2Unit(unit, unitRatio, unitPrecision);
    return {
        postcssPlugin: 'uni-app',
        prepare() {
            return {
                OnceExit(root) {
                    root.walkDecls(walkDecls(rpx2unit));
                    root.walkRules(walkRules(page));
                },
            };
        },
    };
};
exports.uniapp = uniapp;
exports.uniapp.postcss = true;
