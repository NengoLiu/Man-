"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformMatchMedia = void 0;
const transformMatchMedia = (node) => {
    if (node.tag === 'match-media') {
        ;
        node.tag = 'uni-match-media';
    }
};
exports.transformMatchMedia = transformMatchMedia;
