"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTransformEvent = void 0;
const utils_1 = require("../../utils");
function createTransformEvent(options) {
    const transformEvent = (node) => {
        if (!utils_1.isElementNode(node)) {
            return;
        }
        node.props.forEach((prop) => {
            const { arg } = prop;
            if (arg && utils_1.isSimpleExpressionNode(arg)) {
                const eventType = options[arg.content];
                if (eventType) {
                    // e.g tap => click
                    arg.content = eventType;
                }
            }
        });
    };
    return transformEvent;
}
exports.createTransformEvent = createTransformEvent;
