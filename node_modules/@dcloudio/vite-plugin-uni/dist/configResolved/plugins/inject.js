"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniInjectPlugin = void 0;
const path_1 = __importStar(require("path"));
const debug_1 = __importDefault(require("debug"));
const pluginutils_1 = require("@rollup/pluginutils");
const estree_walker_1 = require("estree-walker");
const compiler_sfc_1 = require("@vue/compiler-sfc");
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const utils_1 = require("../../utils");
const debugInject = debug_1.default('vite:uni:inject');
const debugInjectTry = debug_1.default('vite:uni:inject-try');
function uniInjectPlugin(options) {
    if (!options)
        throw new Error('Missing options');
    const filter = pluginutils_1.createFilter(options.include, options.exclude);
    const modules = Object.assign({}, options);
    delete modules.include;
    delete modules.exclude;
    delete modules.sourceMap;
    delete modules.callback;
    const modulesMap = new Map();
    const namespaceModulesMap = new Map();
    Object.keys(modules).forEach((name) => {
        if (name.endsWith('.')) {
            namespaceModulesMap.set(name, modules[name]);
        }
        modulesMap.set(name, modules[name]);
    });
    const hasNamespace = namespaceModulesMap.size > 0;
    // Fix paths on Windows
    if (path_1.sep !== '/') {
        normalizeModulesMap(modulesMap);
        normalizeModulesMap(namespaceModulesMap);
    }
    const firstpass = new RegExp(`(?:${Array.from(modulesMap.keys()).map(escape).join('|')})`, 'g');
    const EXTNAMES = uni_cli_shared_1.EXTNAME_JS.concat(uni_cli_shared_1.EXTNAME_VUE);
    const sourceMap = options.sourceMap !== false;
    const callback = options.callback;
    return {
        name: 'vite:uni-inject',
        transform(code, id) {
            if (!filter(id))
                return null;
            const { filename, query } = uni_cli_shared_1.parseVueRequest(id);
            if (query.vue || !EXTNAMES.includes(path_1.default.extname(filename))) {
                return null;
            }
            debugInjectTry(id);
            if (code.search(firstpass) === -1)
                return null;
            if (path_1.sep !== '/')
                id = id.split(path_1.sep).join('/');
            let ast = null;
            try {
                ast = this.parse(code);
            }
            catch (err) {
                this.warn({
                    code: 'PARSE_ERROR',
                    message: `plugin-inject: failed to parse ${id}. Consider restricting the plugin to particular files via options.include`,
                });
            }
            if (!ast) {
                return null;
            }
            const imports = new Set();
            ast.body.forEach((node) => {
                if (node.type === 'ImportDeclaration') {
                    node.specifiers.forEach((specifier) => {
                        imports.add(specifier.local.name);
                    });
                }
            });
            // analyse scopes
            let scope = pluginutils_1.attachScopes(ast, 'scope');
            const magicString = new compiler_sfc_1.MagicString(code);
            const newImports = new Map();
            function handleReference(node, name, keypath) {
                let mod = modulesMap.get(keypath);
                if (!mod && hasNamespace) {
                    const mods = keypath.split('.');
                    if (mods.length === 2) {
                        mod = namespaceModulesMap.get(mods[0] + '.');
                        if (mod) {
                            mod = [mod, mods[1]];
                        }
                    }
                }
                if (mod && !imports.has(name) && !scope.contains(name)) {
                    if (typeof mod === 'string')
                        mod = [mod, 'default'];
                    if (mod[0] === id)
                        return false;
                    const hash = `${keypath}:${mod[0]}:${mod[1]}`;
                    const importLocalName = name === keypath ? name : pluginutils_1.makeLegalIdentifier(`$inject_${keypath}`);
                    if (!newImports.has(hash)) {
                        if (mod[1] === '*') {
                            newImports.set(hash, `import * as ${importLocalName} from '${mod[0]}';`);
                        }
                        else {
                            newImports.set(hash, `import { ${mod[1]} as ${importLocalName} } from '${mod[0]}';`);
                            callback && callback(newImports, mod);
                        }
                    }
                    if (name !== keypath) {
                        magicString.overwrite(node.start, node.end, importLocalName, {
                            storeName: true,
                        });
                    }
                    return true;
                }
                return false;
            }
            estree_walker_1.walk(ast, {
                enter(node, parent) {
                    if (sourceMap) {
                        magicString.addSourcemapLocation(node.start);
                        magicString.addSourcemapLocation(node.end);
                    }
                    if (node.scope) {
                        scope = node.scope;
                    }
                    if (utils_1.isProperty(node) && node.shorthand) {
                        const { name } = node.key;
                        handleReference(node, name, name);
                        this.skip();
                        return;
                    }
                    if (utils_1.isReference(node, parent)) {
                        const { name, keypath } = flatten(node);
                        const handled = handleReference(node, name, keypath);
                        if (handled) {
                            this.skip();
                        }
                    }
                },
                leave(node) {
                    if (node.scope) {
                        scope = scope.parent;
                    }
                },
            });
            debugInject(id, newImports.size);
            if (newImports.size === 0) {
                return {
                    code,
                    ast,
                    map: sourceMap ? magicString.generateMap({ hires: true }) : null,
                };
            }
            const importBlock = Array.from(newImports.values()).join('\n\n');
            magicString.prepend(`${importBlock}\n\n`);
            return {
                code: magicString.toString(),
                map: sourceMap ? magicString.generateMap({ hires: true }) : null,
            };
        },
    };
}
exports.uniInjectPlugin = uniInjectPlugin;
const escape = (str) => str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
const flatten = (startNode) => {
    const parts = [];
    let node = startNode;
    while (utils_1.isMemberExpression(node)) {
        parts.unshift(node.property.name);
        node = node.object;
    }
    const { name } = node;
    parts.unshift(name);
    return { name, keypath: parts.join('.') };
};
function normalizeModulesMap(modulesMap) {
    modulesMap.forEach((mod, key) => {
        modulesMap.set(key, Array.isArray(mod)
            ? [mod[0].split(path_1.sep).join('/'), mod[1]]
            : mod.split(path_1.sep).join('/'));
    });
}
