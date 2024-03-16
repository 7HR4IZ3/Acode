"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
const utils_1 = require("../utils");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
class BaseService {
    constructor(mode) {
        this.documents = {};
        this.options = {};
        this.globalOptions = {};
        this.serviceCapabilities = {};
        this.mode = mode;
    }
    addDocument(document) {
        this.documents[document.uri] = vscode_languageserver_textdocument_1.TextDocument.create(document.uri, document.languageId, document.version, document.text);
        //TODO:
        /*if (options)
            this.setSessionOptions(sessionID, options);*/
    }
    getDocument(uri) {
        return this.documents[uri];
    }
    removeDocument(document) {
        delete this.documents[document.uri];
        if (this.options[document.uri]) {
            delete this.options[document.uri];
        }
    }
    getDocumentValue(uri) {
        var _a;
        return (_a = this.getDocument(uri)) === null || _a === void 0 ? void 0 : _a.getText();
    }
    setValue(identifier, value) {
        let document = this.getDocument(identifier.uri);
        if (document) {
            document = vscode_languageserver_textdocument_1.TextDocument.create(document.uri, document.languageId, document.version, value);
            this.documents[document.uri] = document;
        }
    }
    setGlobalOptions(options) {
        this.globalOptions = options !== null && options !== void 0 ? options : {};
    }
    setOptions(sessionID, options, merge = false) {
        this.options[sessionID] = merge ? (0, utils_1.mergeObjects)(options, this.options[sessionID]) : options;
    }
    getOption(sessionID, optionName) {
        if (this.options[sessionID] && this.options[sessionID][optionName]) {
            return this.options[sessionID][optionName];
        }
        else {
            return this.globalOptions[optionName];
        }
    }
    applyDeltas(identifier, deltas) {
        let document = this.getDocument(identifier.uri);
        if (document)
            vscode_languageserver_textdocument_1.TextDocument.update(document, deltas, identifier.version);
    }
    async doComplete(document, position) {
        return null;
    }
    async doHover(document, position) {
        return null;
    }
    async doResolve(item) {
        return null;
    }
    async doValidation(document) {
        return [];
    }
    format(document, range, options) {
        return Promise.resolve([]);
    }
    dispose() { }
    async provideSignatureHelp(document, position) {
        return null;
    }
    async findDocumentHighlights(document, position) {
        return [];
    }
    get optionsToFilterDiagnostics() {
        var _a, _b, _c, _d, _e, _f;
        return {
            errorCodesToIgnore: (_a = this.globalOptions.errorCodesToIgnore) !== null && _a !== void 0 ? _a : [],
            errorCodesToTreatAsWarning: (_b = this.globalOptions.errorCodesToTreatAsWarning) !== null && _b !== void 0 ? _b : [],
            errorCodesToTreatAsInfo: (_c = this.globalOptions.errorCodesToTreatAsInfo) !== null && _c !== void 0 ? _c : [],
            errorMessagesToIgnore: (_d = this.globalOptions.errorMessagesToIgnore) !== null && _d !== void 0 ? _d : [],
            errorMessagesToTreatAsWarning: (_e = this.globalOptions.errorMessagesToTreatAsWarning) !== null && _e !== void 0 ? _e : [],
            errorMessagesToTreatAsInfo: (_f = this.globalOptions.errorMessagesToTreatAsInfo) !== null && _f !== void 0 ? _f : [],
        };
    }
}
exports.BaseService = BaseService;
//# sourceMappingURL=base-service.js.map