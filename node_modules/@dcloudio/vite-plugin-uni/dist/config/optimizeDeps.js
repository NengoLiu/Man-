"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOptimizeDeps = void 0;
function createOptimizeDeps(_options) {
    return {
        exclude: [
            'vue',
            'vuex',
            'vue-router',
            '@dcloudio/uni-app',
            '@dcloudio/uni-components',
            '@dcloudio/uni-h5',
            '@dcloudio/uni-h5-vue',
            '@dcloudio/uni-i18n',
            '@dcloudio/uni-shared',
        ],
    };
}
exports.createOptimizeDeps = createOptimizeDeps;
