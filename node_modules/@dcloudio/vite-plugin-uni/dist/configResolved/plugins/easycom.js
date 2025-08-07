"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniEasycomPlugin = void 0;
const path_1 = __importDefault(require("path"));
const pluginutils_1 = require("@rollup/pluginutils");
const shared_1 = require("@vue/shared");
const uni_shared_1 = require("@dcloudio/uni-shared");
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const utils_1 = require("../../utils");
const H5_COMPONENTS_PATH = '@dcloudio/uni-h5';
const baseComponents = [
    'audio',
    'button',
    'canvas',
    'checkbox',
    'checkbox-group',
    'editor',
    'form',
    'icon',
    'image',
    'input',
    'label',
    'movable-area',
    'movable-view',
    'navigator',
    'picker-view',
    'picker-view-column',
    'progress',
    'radio',
    'radio-group',
    'resize-sensor',
    'rich-text',
    'scroll-view',
    'slider',
    'swiper',
    'swiper-item',
    'switch',
    'text',
    'textarea',
    'view',
];
function uniEasycomPlugin(options) {
    const filter = pluginutils_1.createFilter(options.include, options.exclude);
    return {
        name: 'vite:uni-easycom',
        transform(code, id) {
            if (!filter(id)) {
                return;
            }
            const { filename, query } = uni_cli_shared_1.parseVueRequest(id);
            if (query.type !== 'template' &&
                (query.vue || !uni_cli_shared_1.EXTNAME_VUE.includes(path_1.default.extname(filename)))) {
                return;
            }
            utils_1.debugEasycom(id);
            let i = 0;
            const importDeclarations = [];
            code = code.replace(/_resolveComponent\("(.+?)"(, true)?\)/g, (str, name) => {
                if (name && !name.startsWith('_')) {
                    if (uni_shared_1.isBuiltInComponent(name)) {
                        return addBuiltInImportDeclaration(importDeclarations, `__syscom_${i++}`, name);
                    }
                    const source = utils_1.matchEasycom(name);
                    if (source) {
                        return addImportDeclaration(importDeclarations, `__easycom_${i++}`, source);
                    }
                }
                return str;
            });
            if (importDeclarations.length) {
                code = importDeclarations.join('') + code;
            }
            return code;
        },
    };
}
exports.uniEasycomPlugin = uniEasycomPlugin;
function addBuiltInImportDeclaration(importDeclarations, local, name) {
    if (baseComponents.includes(name)) {
        importDeclarations.push(`import '${uni_cli_shared_1.BASE_COMPONENTS_STYLE_PATH + name + '.css'}';`);
    }
    else {
        importDeclarations.push(`import '${uni_cli_shared_1.H5_COMPONENTS_STYLE_PATH + name + '.css'}';`);
    }
    const deps = uni_cli_shared_1.COMPONENT_DEPS_CSS[name];
    if (deps) {
        deps.forEach((dep) => importDeclarations.push(`import '${dep}';`));
    }
    return addImportDeclaration(importDeclarations, local, H5_COMPONENTS_PATH, shared_1.capitalize(shared_1.camelize(name)));
}
function addImportDeclaration(importDeclarations, local, source, imported) {
    importDeclarations.push(createImportDeclaration(local, source, imported));
    return local;
}
function createImportDeclaration(local, source, imported) {
    if (imported) {
        return `import {${imported} as ${local}} from '${source}';`;
    }
    return `import ${local} from '${source}';`;
}
