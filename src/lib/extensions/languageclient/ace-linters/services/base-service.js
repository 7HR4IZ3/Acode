import { mergeObjects } from "../utils";
import { TextDocument } from "vscode-languageserver-textdocument";
export class BaseService {
    mode;
    documents = {};
    options = {};
    globalOptions = {};
    serviceData;
    serviceCapabilities = {};
    constructor(mode) {
        this.mode = mode;
    }
    addDocument(document) {
        this.documents[document.uri] = TextDocument.create(document.uri, document.languageId, document.version, document.text);
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
        return this.getDocument(uri)?.getText();
    }
    setValue(identifier, value) {
        let document = this.getDocument(identifier.uri);
        if (document) {
            document = TextDocument.create(document.uri, document.languageId, document.version, value);
            this.documents[document.uri] = document;
        }
    }
    setGlobalOptions(options) {
        this.globalOptions = options ?? {};
    }
    setOptions(sessionID, options, merge = false) {
        this.options[sessionID] = merge ? mergeObjects(options, this.options[sessionID]) : options;
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
            TextDocument.update(document, deltas, identifier.version);
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
        return {
            errorCodesToIgnore: this.globalOptions.errorCodesToIgnore ?? [],
            errorCodesToTreatAsWarning: this.globalOptions.errorCodesToTreatAsWarning ?? [],
            errorCodesToTreatAsInfo: this.globalOptions.errorCodesToTreatAsInfo ?? [],
            errorMessagesToIgnore: this.globalOptions.errorMessagesToIgnore ?? [],
            errorMessagesToTreatAsWarning: this.globalOptions.errorMessagesToTreatAsWarning ?? [],
            errorMessagesToTreatAsInfo: this.globalOptions.errorMessagesToTreatAsInfo ?? [],
        };
    }
}
