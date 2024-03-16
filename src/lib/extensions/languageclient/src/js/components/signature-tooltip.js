"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignatureTooltip = void 0;
const base_tooltip_1 = require("./base-tooltip");
class SignatureTooltip extends base_tooltip_1.BaseTooltip {
    constructor() {
        super(...arguments);
        this.provideSignatureHelp = () => {
            if (!this.provider.options.functionality.signatureHelp)
                return;
            let cursor = this.$activeEditor.getCursorPosition();
            let session = this.$activeEditor.session;
            let docPos = session.screenToDocumentPosition(cursor.row, cursor.column);
            this.provider.provideSignatureHelp(session, docPos, (tooltip) => {
                var _a, _b, _c, _d, _e;
                let descriptionText = tooltip ? this.provider.getTooltipText(tooltip) : null;
                if (!tooltip || !descriptionText) {
                    this.hide();
                    return;
                }
                let token = session.getTokenAt(docPos.row, docPos.column);
                let row = (_b = (_a = tooltip.range) === null || _a === void 0 ? void 0 : _a.start.row) !== null && _b !== void 0 ? _b : docPos.row;
                let column = (_e = (_d = (_c = tooltip.range) === null || _c === void 0 ? void 0 : _c.start.column) !== null && _d !== void 0 ? _d : token === null || token === void 0 ? void 0 : token.start) !== null && _e !== void 0 ? _e : 0;
                if (this.descriptionText != descriptionText) {
                    this.hide();
                    this.setHtml(descriptionText);
                    this.descriptionText = descriptionText;
                }
                else if (this.row == row && this.column == column && this.isOpen) {
                    return;
                }
                this.row = row;
                this.column = column;
                if (this.$mouseMoveTimer) {
                    this.$show();
                }
                else {
                    this.$showTimer = setTimeout(() => {
                        this.$show();
                        this.$showTimer = undefined;
                    }, 500);
                }
            });
        };
        this.onChangeSelection = (editor) => {
            this.update(editor);
        };
    }
    registerEditor(editor) {
        // @ts-ignore
        editor.on("changeSelection", () => this.onChangeSelection(editor));
    }
    update(editor) {
        clearTimeout(this.$mouseMoveTimer);
        clearTimeout(this.$showTimer);
        if (this.isOpen) {
            this.provideSignatureHelp();
        }
        else {
            this.$mouseMoveTimer = setTimeout(() => {
                this.$activateEditor(editor);
                this.provideSignatureHelp();
                this.$mouseMoveTimer = undefined;
            }, 500);
        }
    }
    ;
}
exports.SignatureTooltip = SignatureTooltip;
//# sourceMappingURL=signature-tooltip.js.map