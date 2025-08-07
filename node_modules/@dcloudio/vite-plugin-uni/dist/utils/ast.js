"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSimpleExpressionNode = exports.isDirectiveNode = exports.isElementNode = exports.parseVue = exports.createLiteral = exports.isReference = exports.isExportSpecifier = exports.isMethodDefinition = exports.isMemberExpression = exports.isCallExpression = exports.isIdentifier = exports.isProperty = void 0;
const compiler_dom_1 = require("@vue/compiler-dom");
const isProperty = (node) => node.type === 'Property';
exports.isProperty = isProperty;
const isIdentifier = (node) => node.type === 'Identifier';
exports.isIdentifier = isIdentifier;
const isCallExpression = (node) => node.type === 'CallExpression';
exports.isCallExpression = isCallExpression;
const isMemberExpression = (node) => node.type === 'MemberExpression';
exports.isMemberExpression = isMemberExpression;
const isMethodDefinition = (node) => node.type === 'MethodDefinition';
exports.isMethodDefinition = isMethodDefinition;
const isExportSpecifier = (node) => node.type === 'ExportSpecifier';
exports.isExportSpecifier = isExportSpecifier;
const isReference = (node, parent) => {
    if (exports.isMemberExpression(node)) {
        return !node.computed && exports.isReference(node.object, node);
    }
    if (exports.isIdentifier(node)) {
        if (exports.isMemberExpression(parent))
            return parent.computed || node === parent.object;
        // `bar` in { bar: foo }
        if (exports.isProperty(parent) && node !== parent.value)
            return false;
        // `bar` in `class Foo { bar () {...} }`
        if (exports.isMethodDefinition(parent))
            return false;
        // `bar` in `export { foo as bar }`
        if (exports.isExportSpecifier(parent) && node !== parent.local)
            return false;
        return true;
    }
    return false;
};
exports.isReference = isReference;
function createLiteral(value) {
    return {
        type: 'Literal',
        value,
        raw: `'${value}'`,
    };
}
exports.createLiteral = createLiteral;
function parseVue(code, errors) {
    return compiler_dom_1.parse(code, {
        isNativeTag: () => true,
        isPreTag: () => true,
        getTextMode: () => 0 /* DATA */,
        onError: (e) => {
            errors.push(e);
        },
    });
}
exports.parseVue = parseVue;
function isElementNode(node) {
    return node.type === 1 /* ELEMENT */;
}
exports.isElementNode = isElementNode;
function isDirectiveNode(node) {
    return node.type === 7 /* DIRECTIVE */;
}
exports.isDirectiveNode = isDirectiveNode;
function isSimpleExpressionNode(node) {
    return node.type === 4 /* SIMPLE_EXPRESSION */;
}
exports.isSimpleExpressionNode = isSimpleExpressionNode;
