import { BaseService } from "../base-service";
import * as cssService from 'vscode-css-languageservice';
import { mergeObjects } from "../../utils";
import { filterDiagnostics } from "../../type-converters/lsp-converters";
export class CssService extends BaseService {
    $service;
    $languageId;
    $defaultFormatOptions = {
        newlineBetweenRules: true,
        newlineBetweenSelectors: true,
        preserveNewLines: true,
        spaceAroundSelectorSeparator: false,
        braceStyle: "collapse"
    };
    serviceCapabilities = {
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
    constructor(mode) {
        super(mode);
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
        this.$defaultFormatOptions.tabSize = options.tabSize;
        this.$defaultFormatOptions.insertSpaces = options.insertSpaces;
        return mergeObjects(this.globalOptions?.formatOptions, this.$defaultFormatOptions);
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
        return filterDiagnostics(this.$service.doValidation(fullDocument, cssDocument), this.optionsToFilterDiagnostics);
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
