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
exports.CssService = void 0;
const base_service_1 = require("../base-service");
const cssService = __importStar(require("vscode-css-languageservice"));
const utils_1 = require("../../utils");
const lsp_converters_1 = require("../../type-converters/lsp-converters");
class CssService extends base_service_1.BaseService {
    constructor(mode) {
        super(mode);
        this.$defaultFormatOptions = {
            newlineBetweenRules: true,
            newlineBetweenSelectors: true,
            preserveNewLines: true,
            spaceAroundSelectorSeparator: false,
            braceStyle: "collapse"
        };
        this.serviceCapabilities = {
            completionProvider: {
                triggerCharacters: [":", " ", "-", "/"],
                resolveProvider: true
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
        this.$initLanguageService();
        this.$service.configure();
    }
    $initLanguageService() {
        switch (this.mode) {
            case "less":
                this.$languageId = "less";
                this.$service = cssService.getLESSLanguageService();
                break;
            case "scss":
                this.$languageId = "scss";
                this.$service = cssService.getSCSSLanguageService();
                break;
            case "css":
            default:
                this.$languageId = "css";
                this.$service = cssService.getCSSLanguageService();
                break;
        }
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
    async findDocumentSymbols(document) {
        let fullDocument = this.getDocument(document.uri);
        if (!fullDocument)
            return null;
        let cssDocument = this.$service.parseStylesheet(fullDocument);
        return this.$service.findDocumentSymbols(fullDocument, cssDocument);
    }
    async doHover(document, position) {
        let fullDocument = this.getDocument(document.uri);
        if (!fullDocument)
            return null;
        let cssDocument = this.$service.parseStylesheet(fullDocument);
        return this.$service.doHover(fullDocument, position, cssDocument);
    }
    async doValidation(document) {
        let fullDocument = this.getDocument(document.uri);
        if (!fullDocument)
            return [];
        let cssDocument = this.$service.parseStylesheet(fullDocument);
        return (0, lsp_converters_1.filterDiagnostics)(this.$service.doValidation(fullDocument, cssDocument), this.optionsToFilterDiagnostics);
    }
    async doComplete(document, position) {
        let fullDocument = this.getDocument(document.uri);
        if (!fullDocument)
            return null;
        let cssDocument = this.$service.parseStylesheet(fullDocument);
        return this.$service.doComplete(fullDocument, position, cssDocument);
    }
    async doResolve(item) {
        return item;
    }
    async findDocumentHighlights(document, position) {
        let fullDocument = this.getDocument(document.uri);
        if (!fullDocument)
            return [];
        const cssDocument = this.$service.parseStylesheet(fullDocument);
        const highlights = this.$service.findDocumentHighlights(fullDocument, position, cssDocument);
        return Promise.resolve(highlights);
    }
}
exports.CssService = CssService;
//# sourceMappingURL=css-service.js.map