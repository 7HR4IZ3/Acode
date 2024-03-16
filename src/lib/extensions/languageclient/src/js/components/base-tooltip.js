"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTooltip = void 0;
const tooltip_1 = require("../ace/tooltip");
class BaseTooltip extends tooltip_1.Tooltip {
    constructor(provider) {
        super(document.body);
        this.$hide = () => {
            clearTimeout(this.$mouseMoveTimer);
            clearTimeout(this.$showTimer);
            if (this.isOpen) {
                this.$removeEditorEvents();
                this.hide();
            }
            this.$inactivateEditor();
        };
        this.onMouseOut = (e) => {
            clearTimeout(this.$mouseMoveTimer);
            clearTimeout(this.$showTimer);
            if (!e.relatedTarget || e.relatedTarget == this.getElement())
                return;
            //@ts-ignore
            if (e && e.currentTarget.contains(e.relatedTarget))
                return;
            //@ts-ignore
            if (!e.relatedTarget.classList.contains("ace_content"))
                this.$hide();
        };
        this.provider = provider;
        //this is for ace-code version < 1.16.0
        try {
            tooltip_1.Tooltip.call(this, document.body);
        }
        catch (e) {
        }
        this.getElement().style.pointerEvents = "auto";
        this.getElement().style.whiteSpace = "pre-wrap";
        this.getElement().addEventListener("mouseout", this.onMouseOut);
    }
    $show() {
        if (!this.$activeEditor)
            return;
        let renderer = this.$activeEditor.renderer;
        let position = renderer.textToScreenCoordinates(this.row, this.column);
        let cursorPos = this.$activeEditor.getCursorPosition();
        this.show(null, position.pageX, position.pageY);
        let labelHeight = this.getElement().getBoundingClientRect().height;
        let rect = renderer.scroller.getBoundingClientRect();
        let isTopdown = true;
        if (this.row > cursorPos.row)
            // don't obscure cursor
            isTopdown = true;
        else if (this.row < cursorPos.row)
            // don't obscure cursor
            isTopdown = false;
        if (position.pageY - labelHeight + renderer.lineHeight < rect.top)
            // not enough space above us
            isTopdown = true;
        else if (position.pageY + labelHeight > rect.bottom)
            isTopdown = false;
        if (!isTopdown)
            position.pageY -= labelHeight;
        else
            position.pageY += renderer.lineHeight;
        this.getElement().style.maxWidth = rect.width - (position.pageX - rect.left) + "px";
        this.show(null, position.pageX, position.pageY);
    }
    getElement() {
        return super.getElement();
    }
    hide() {
        super.hide();
    }
    show(param, pageX, pageY) {
        super.show(param, pageX, pageY);
        this.$registerEditorEvents();
    }
    setHtml(descriptionText) {
        super.setHtml(descriptionText);
    }
    destroy() {
        this.$hide();
        this.getElement().removeEventListener("mouseout", this.onMouseOut);
    }
    ;
    $registerEditorEvents() {
        this.$activeEditor.on("change", this.$hide);
        this.$activeEditor.on("mousewheel", this.$hide);
        //@ts-ignore
        this.$activeEditor.on("mousedown", this.$hide);
    }
    $removeEditorEvents() {
        this.$activeEditor.off("change", this.$hide);
        this.$activeEditor.off("mousewheel", this.$hide);
        //@ts-ignore
        this.$activeEditor.off("mousedown", this.$hide);
    }
    $inactivateEditor() {
        var _a;
        (_a = this.$activeEditor) === null || _a === void 0 ? void 0 : _a.container.removeEventListener("mouseout", this.onMouseOut);
        this.$activeEditor = undefined;
    }
    $activateEditor(editor) {
        if (this.$activeEditor == editor)
            return;
        this.$inactivateEditor();
        this.$activeEditor = editor;
        this.$activeEditor.container.addEventListener("mouseout", this.onMouseOut);
    }
}
exports.BaseTooltip = BaseTooltip;
//# sourceMappingURL=base-tooltip.js.map