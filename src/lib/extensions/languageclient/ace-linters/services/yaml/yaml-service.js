import { BaseService } from "../base-service";
import { getLanguageService } from "./lib";
import { filterDiagnostics } from "../../type-converters/lsp-converters";
export class YamlService extends BaseService {
    $service;
    schemas = {};
    serviceCapabilities = {
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
    constructor(mode) {
        super(mode);
        this.$service = getLanguageService((uri) => {
            uri = uri.replace("file:///", "");
            let jsonSchema = this.schemas[uri];
            if (jsonSchema)
                return Promise.resolve(jsonSchema);
            return Promise.reject(`Unable to load schema at ${uri}`);
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
        schemas?.forEach((el) => {
            if (el.uri === this.$getYamlSchemaUri(sessionID)) {
                el.fileMatch ??= [];
                el.fileMatch.push(sessionID);
            }
            let schema = el.schema ?? this.schemas[el.uri];
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
        schemas?.forEach((el) => {
            if (el.uri === this.$getYamlSchemaUri(document.uri)) {
                el.fileMatch = el.fileMatch?.filter((pattern) => pattern != document.uri);
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
        return Promise.resolve(this.$service.doFormat(fullDocument, {}));
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
        return filterDiagnostics(await this.$service.doValidation(fullDocument, false), this.optionsToFilterDiagnostics);
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
