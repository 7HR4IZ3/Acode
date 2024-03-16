"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AceRange = void 0;
class AceRange {
    static getConstructor(editor) {
        if (!AceRange._instance && editor) {
            AceRange._instance = editor.getSelectionRange().constructor;
        }
        return AceRange._instance;
    }
}
exports.AceRange = AceRange;
//# sourceMappingURL=range-singleton.js.map