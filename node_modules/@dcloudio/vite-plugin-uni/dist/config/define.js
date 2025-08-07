"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefine = void 0;
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const utils_1 = require("../utils");
function createDefine({ inputDir, platform }, config, { command }) {
    return utils_1.initFeatures({
        inputDir,
        command,
        platform,
        pagesJson: uni_cli_shared_1.parsePagesJsonOnce(inputDir, platform),
        manifestJson: uni_cli_shared_1.parseManifestJsonOnce(inputDir),
        ssr: utils_1.isSsr(command, config) || utils_1.isSsrManifest(command, config),
    });
}
exports.createDefine = createDefine;
