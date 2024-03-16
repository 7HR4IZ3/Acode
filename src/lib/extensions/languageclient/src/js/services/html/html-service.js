"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HtmlService = void 0;
const base_service_1 = require("../base-service");
const htmlhint_1 = require("htmlhint");
const htmlService = __importStar(require("vscode-html-languageservice"));
const utils_1 = require("../../utils");
const html_converters_1 = require("./html-converters");
class HtmlService extends base_service_1.BaseService {
    constructor(mode) {
        super(mode);
        this.defaultValidationOptions = {
            "attr-no-duplication": true,
            "body-no-duplicates": true,
            "head-body-descendents-html": true,
            "head-no-duplicates": true,
            "head-valid-children": true,
            "html-no-duplicates": true,
            "html-root-node": true,
            "html-valid-children": true,
            "html-valid-children-order": true,
            "img-src-required": true,
            "invalid-attribute-char": true,
            "nested-paragraphs": true,
            "spec-char-escape": true,
            "src-not-empty": true,
            "tag-pair": true
        };
        this.$defaultFormatOptions = {
            wrapAttributes: "auto",
            wrapAttributesIndentSize: 120
        };
        this.serviceCapabilities = {
            completionProvider: {
                triggerCharacters: ['.', ':', '<', '"', '=', '/']
            },
            diagnosticProvider: {
                interFileDependencies: true,
                workspaceDiagnostics: true
            },
            documentRangeFormattingProvider: true,
            documentFormattingProvider: true,
            documentHighlightProvider: true,
            hoverProvider: true,
            documentSymbolProvider: true
        };
        this.$service = htmlService.getLanguageService();
    }
    getFormattingOptions(options) {
        var _a;
        this.$defaultFormatOptions.tabSize = options.tabSize;
        this.$defaultFormatOptions.insertSpaces = options.insertSpaces;
        return (0, utils_1.mergeObjects)((_a = this.globalOptions) === null || _a === void 0 ? void 0 : _a.formatOptions, this.$defaultFormatOptions);
    }
    format(document, range, options) {
        let fullDocument = this.getDocument(document.uri);
        if (!fullDocument)
            return Promise.resolve([]);
        return Promise.resolve(this.$service.format(fullDocument, range, this.getFormattingOptions(options)));
    }
    findDocumentSymbols(document) {
        let fullDocument = this.getDocument(document.uri);
        if (!fullDocument)
            return null;
        let htmlDocument = this.$service.parseHTMLDocument(fullDocument);
        return this.$service.findDocumentSymbols(fullDocument, htmlDocument);
    }
    async doHover(document, position) {
        let fullDocument = this.getDocument(document.uri);
        if (!fullDocument)
            return null;
        let htmlDocument = this.$service.parseHTMLDocument(fullDocument);
        return this.$service.doHover(fullDocument, position, htmlDocument);
    }
    async doValidation(document) {
        var _a;
        let fullDocument = this.getDocument(document.uri);
        if (!fullDocument) {
            return [];
        }
        let options = (_a = this.getOption(document.uri, "validationOptions")) !== null && _a !== void 0 ? _a : this.defaultValidationOptions;
        return (0, html_converters_1.toDiagnostics)(htmlhint_1.HTMLHint.verify(fullDocument.getText(), options), this.optionsToFilterDiagnostics);
    }
    async doComplete(document, position) {
        let fullDocument = this.getDocument(document.uri);
        if (!fullDocument)
            return null;
        let htmlDocument = this.$service.parseHTMLDocument(fullDocument);
        return this.$service.doComplete(fullDocument, position, htmlDocument);
    }
    async doResolve(item) {
        return item;
    }
    async findDocumentHighlights(document, position) {
        let fullDocument = this.getDocument(document.uri);
        if (!fullDocument)
            return [];
        let htmlDocument = this.$service.parseHTMLDocument(fullDocument);
        return this.$service.findDocumentHighlights(fullDocument, position, htmlDocument);
    }
}
exports.HtmlService = HtmlService;
//# sourceMappingURL=html-service.js.map