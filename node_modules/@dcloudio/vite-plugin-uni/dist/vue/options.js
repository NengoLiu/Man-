"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initPluginViteLegacyOptions = exports.initPluginVueJsxOptions = exports.initPluginVueOptions = void 0;
const shared_1 = require("@vue/shared");
const uni_shared_1 = require("@dcloudio/uni-shared");
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const transformMatchMedia_1 = require("./transforms/transformMatchMedia");
const transformEvent_1 = require("./transforms/transformEvent");
function createUniVueTransformAssetUrls(base) {
    return {
        base,
        tags: {
            audio: ['src'],
            video: ['src', 'poster'],
            img: ['src'],
            image: ['src'],
            'cover-image': ['src'],
            // h5
            'v-uni-audio': ['src'],
            'v-uni-video': ['src', 'poster'],
            'v-uni-image': ['src'],
            'v-uni-cover-image': ['src'],
            // nvue
            'u-image': ['src'],
            'u-video': ['src', 'poster'],
        },
    };
}
function initPluginVueOptions(options) {
    const vueOptions = options.vueOptions || (options.vueOptions = {});
    if (!vueOptions.include) {
        vueOptions.include = [];
    }
    if (!shared_1.isArray(vueOptions.include)) {
        vueOptions.include = [vueOptions.include];
    }
    vueOptions.include.push(uni_cli_shared_1.EXTNAME_VUE_RE);
    const templateOptions = vueOptions.template || (vueOptions.template = {});
    templateOptions.transformAssetUrls = createUniVueTransformAssetUrls(options.base);
    const compilerOptions = templateOptions.compilerOptions || (templateOptions.compilerOptions = {});
    compilerOptions.isNativeTag = uni_shared_1.isNativeTag;
    if (!compilerOptions.nodeTransforms) {
        compilerOptions.nodeTransforms = [];
    }
    const compatConfig = uni_cli_shared_1.parseCompatConfigOnce(options.inputDir);
    compilerOptions.compatConfig = shared_1.extend(compilerOptions.compatConfig || {}, compatConfig);
    compilerOptions.nodeTransforms.unshift(transformEvent_1.createTransformEvent({}));
    if (options.platform !== 'mp-weixin') {
        compilerOptions.nodeTransforms.unshift(transformMatchMedia_1.transformMatchMedia);
    }
    return vueOptions;
}
exports.initPluginVueOptions = initPluginVueOptions;
function initPluginVueJsxOptions(options) {
    const vueJsxOptions = options.vueJsxOptions || (options.vueJsxOptions = {});
    if (!shared_1.hasOwn(vueJsxOptions, 'optimize')) {
        vueJsxOptions.optimize = true;
    }
    vueJsxOptions.isCustomElement = uni_shared_1.isCustomElement;
    return vueJsxOptions;
}
exports.initPluginVueJsxOptions = initPluginVueJsxOptions;
function initPluginViteLegacyOptions(options) {
    const viteLegacyOptions = options.viteLegacyOptions || (options.viteLegacyOptions = {});
    return viteLegacyOptions;
}
exports.initPluginViteLegacyOptions = initPluginViteLegacyOptions;
