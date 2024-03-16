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
exports.JsonService = void 0;
const base_service_1 = require("../base-service");
const jsonService = __importStar(require("vscode-json-languageservice"));
const lsp_converters_1 = require("../../type-converters/lsp-converters");
class JsonService extends base_service_1.BaseService {
    constructor(mode) {
        super(mode);
        this.schemas = {};
        this.serviceCapabilities = {
            completionProvider: {
                triggerCharacters: ['"', ':']
            },
            diagnosticProvider: {
                interFileDependencies: true,
                workspaceDiagnostics: true
            },
            documentRangeFormattingProvider: true,
            documentFormattingProvider: true,
            hoverProvider: true,
            documentSymbolProvider: true
        };
        this.$service = jsonService.getLanguageService({
            schemaRequestService: (uri) => {
                uri = uri.replace("file:///", "");
                let jsonSchema = this.schemas[uri];
                if (jsonSchema)
                    return Promise.resolve(jsonSchema);
                return Promise.reject(`Unable to load schema at ${uri}`);
            }
        });
    }
    $getJsonSchemaUri(sessionID) {
        return this.getOption(sessionID, "schemaUri");
    }
    addDocument(document) {
        super.addDocument(document);
        this.$configureService(document.uri);
    }
    $configureService(sessionID) {
        let schemas = this.getOption(sessionID !== null && sessionID !== void 0 ? sessionID : "", "schemas");
        let sessionIDs = sessionID ? [] : Object.keys(this.documents);
        schemas === null || schemas === void 0 ? void 0 : schemas.forEach((el) => {
            var _a, _b;
            if (sessionID) {
                if (this.$getJsonSchemaUri(sessionID) == el.uri) {
                    (_a = el.fileMatch) !== null && _a !== void 0 ? _a : (el.fileMatch = []);
                    el.fileMatch.push(sessionID);
                }
            }
            else {
                el.fileMatch = sessionIDs.filter(sessionID => this.$getJsonSchemaUri(sessionID) == el.uri);
            }
            let schema = (_b = el.schema) !== null && _b !== void 0 ? _b : this.schemas[el.uri];
            if (schema)
                this.schemas[el.uri] = schema;
            this.$service.resetSchema(el.uri);
            el.schema = undefined;
        });
        this.$service.configure({
            schemas: schemas,
            allowComments: this.mode === "json5"
        });
    }
    removeDocument(document) {
        super.removeDocument(document);
        let schemas = this.getOption(document.uri, "schemas");
        schemas === null || schemas === void 0 ? void 0 : schemas.forEach((el) => {
            var _a;
            if (el.uri === this.$getJsonSchemaUri(document.uri)) {
                el.fileMatch = (_a = el.fileMatch) === null || _a === void 0 ? void 0 : _a.filter((pattern) => pattern != document.uri);
            }
        });
        this.$service.configure({
            schemas: schemas,
            allowComments: this.mode === "json5"
        });
    }
    setOptions(sessionID, options, merge = false) {
        super.setOptions(sessionID, options, merge);
        this.$configureService(sessionID);
    }
    setGlobalOptions(options) {
        super.setGlobalOptions(options);
        this.$configureService();
    }
    format(document, range, options) {
        let fullDocument = this.getDocument(document.uri);
        if (!fullDocument)
            return Promise.resolve([]);
        return Promise.resolve(this.$service.format(fullDocument, range, options));
    }
    findDocumentSymbols(document) {
        let fullDocument = this.getDocument(document.uri);
        if (!fullDocument)
            return null;
        let jsonDocument = this.$service.parseJSONDocument(fullDocument);
        return this.$service.findDocumentSymbols(fullDocument, jsonDocument);
    }
    async doHover(document, position) {
        let fullDocument = this.getDocument(document.uri);
        if (!fullDocument)
            return null;
        let jsonDocument = this.$service.parseJSONDocument(fullDocument);
        return this.$service.doHover(fullDocument, position, jsonDocument);
    }
    async doValidation(document) {
        let fullDocument = this.getDocument(document.uri);
        if (!fullDocument)
            return [];
        let jsonDocument = this.$service.parseJSONDocument(fullDocument);
        let diagnostics = await this.$service.doValidation(fullDocument, jsonDocument, { trailingCommas: this.mode === "json5" ? "ignore" : "error" });
        return (0, lsp_converters_1.filterDiagnostics)(diagnostics, this.optionsToFilterDiagnostics);
    }
    async doComplete(document, position) {
        let fullDocument = this.getDocument(document.uri);
        if (!fullDocument)
            return null;
        let jsonDocument = this.$service.parseJSONDocument(fullDocument);
        return this.$service.doComplete(fullDocument, position, jsonDocument);
    }
    async doResolve(item) {
        return this.$service.doResolve(item);
    }
}
exports.JsonService = JsonService;
//# sourceMappingURL=json-service.js.map