"use strict";
var CLASSNAME = "ace_tooltip";
export class Tooltip {
    $element;
    isOpen;
    $parentNode;
    constructor(parentNode) {
        this.isOpen = false;
        this.$element = null;
        this.$parentNode = parentNode;
    }
    $init() {
        this.$element = document.createElement("div");
        this.$element.className = CLASSNAME;
        this.$element.style.display = "none";
        this.$parentNode.appendChild(this.$element);
        return this.$element;
    }
    getElement() {
        return this.$element || this.$init();
    }
    setText(text) {
        this.getElement().textContent = text;
    }
    setHtml(html) {
        this.getElement().innerHTML = html;
    }
    setPosition(x, y) {
        this.getElement().style.left = x + "px";
        this.getElement().style.top = y + "px";
    }
    setClassName(className) {
        this.getElement().className += " " + className;
    }
    setTheme(theme) {
        this.getElement().className = CLASSNAME + " " +
            (theme.isDark ? "ace_dark " : "") + (theme.cssClass || "");
    }
    show(text, x, y) {
        if (text != null)
            this.setText(text);
        if (x != null && y != null)
            this.setPosition(x, y);
        if (!this.isOpen) {
            this.getElement().style.display = "block";
            this.isOpen = true;
        }
    }
    hide() {
        if (this.isOpen) {
            this.getElement().style.display = "none";
            this.getElement().className = CLASSNAME;
            this.isOpen = false;
        }
    }
    getHeight() {
        return this.getElement().offsetHeight;
    }
    getWidth() {
        return this.getElement().offsetWidth;
    }
    destroy() {
        this.isOpen = false;
        if (this.$element && this.$element.parentNode) {
            this.$element.parentNode.removeChild(this.$element);
        }
    }
}
