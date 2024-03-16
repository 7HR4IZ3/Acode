import { BaseService } from "../base-service";
import { HTMLHint } from 'htmlhint';
import * as htmlService from 'vscode-html-languageservice';
import { mergeObjects } from "../../utils";
import { toDiagnostics } from "./html-converters";
export class HtmlService extends BaseService {
    $service;
    defaultValidationOptions = {
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
    $defaultFormatOptions = {
        wrapAttributes: "auto",
        wrapAttributesIndentSize: 120
    };
    serviceCapabilities = {
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
    constructor(mode) {
        super(mode);
        this.$service = htmlService.getLanguageService();
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
        let fullDocument = this.getDocument(document.uri);
        if (!fullDocument) {
            return [];
        }
        let options = this.getOption(document.uri, "validationOptions") ?? this.defaultValidationOptions;
        return toDiagnostics(HTMLHint.verify(fullDocument.getText(), options), this.optionsToFilterDiagnostics);
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
