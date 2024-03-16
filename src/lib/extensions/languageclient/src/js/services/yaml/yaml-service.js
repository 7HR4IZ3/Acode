"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YamlService = void 0;
const base_service_1 = require("../base-service");
const lib_1 = require("./lib");
const lsp_converters_1 = require("../../type-converters/lsp-converters");
class YamlService extends base_service_1.BaseService {
    constructor(mode) {
        super(mode);
        this.schemas = {};
        this.serviceCapabilities = {
            completionProvider: {
                resolveProvider: true
            },
            diagnosticProvider: {
                interFileDependencies: true,
                workspaceDiagnostics: true
            },
            documentRangeFormattingProvider: true,
            documentFormattingProvider: true,
            hoverProvider: true
        };
        this.$service = (0, lib_1.getLanguageService)((uri) => {
            uri = uri.replace("file:///", "");
            let jsonSchema = this.schemas[uri];
            if (jsonSchema)
                return Promise.resolve(jsonSchema);
            return Promise.reject(`Unable to load schema at ${uri}`);
            //@ts-ignore
        }, null, null, null, null);
    }
    $getYamlSchemaUri(sessionID) {
        return this.getOption(sessionID, "schemaUri");
    }
    addDocument(document) {
        super.addDocument(document);
        this.$configureService(document.uri);
    }
    $configureService(sessionID) {
        let schemas = this.getOption(sessionID, "schemas");
        schemas === null || schemas === void 0 ? void 0 : schemas.forEach((el) => {
            var _a, _b;
            if (el.uri === this.$getYamlSchemaUri(sessionID)) {
                (_a = el.fileMatch) !== null && _a !== void 0 ? _a : (el.fileMatch = []);
                el.fileMatch.push(sessionID);
            }
            let schema = (_b = el.schema) !== null && _b !== void 0 ? _b : this.schemas[el.uri];
            if (schema)
                this.schemas[el.uri] = schema;
            this.$service.resetSchema(el.uri);
            el.schema = undefined;
        });
        this.$service.configure({
            schemas: schemas,
            hover: true,
            validate: true,
            completion: true,
            format: true,
            customTags: false
        });
    }
    removeDocument(document) {
        super.removeDocument(document);
        let schemas = this.getOption(document.uri, "schemas");
        schemas === null || schemas === void 0 ? void 0 : schemas.forEach((el) => {
            var _a;
            if (el.uri === this.$getYamlSchemaUri(document.uri)) {
                el.fileMatch = (_a = el.fileMatch) === null || _a === void 0 ? void 0 : _a.filter((pattern) => pattern != document.uri);
            }
        });
        this.$service.configure({
            schemas: schemas
        });
    }
    setOptions(sessionID, options, merge = false) {
        super.setOptions(sessionID, options, merge);
        this.$configureService(sessionID);
    }
    setGlobalOptions(options) {
        super.setGlobalOptions(options);
        this.$configureService("");
    }
    format(document, range, options) {
        let fullDocument = this.getDocument(document.uri);
        if (!fullDocument)
            return Promise.resolve([]);
        return Promise.resolve(this.$service.doFormat(fullDocument, {})); //TODO: options?
    }
    async doHover(document, position) {
        let fullDocument = this.getDocument(document.uri);
        if (!fullDocument)
            return null;
        return this.$service.doHover(fullDocument, position);
    }
    async doValidation(document) {
        let fullDocument = this.getDocument(document.uri);
        if (!fullDocument)
            return [];
        return (0, lsp_converters_1.filterDiagnostics)(await this.$service.doValidation(fullDocument, false), this.optionsToFilterDiagnostics);
    }
    async doComplete(document, position) {
        let fullDocument = this.getDocument(document.uri);
        if (!fullDocument)
            return null;
        return this.$service.doComplete(fullDocument, position, false);
    }
    async doResolve(item) {
        return item;
    }
}
exports.YamlService = YamlService;
//# sourceMappingURL=yaml-service.js.map