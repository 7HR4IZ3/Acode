"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XmlService = void 0;
const base_service_1 = require("../base-service");
const parser_1 = require("@xml-tools/parser");
const ast_1 = require("@xml-tools/ast");
const constraints_1 = require("@xml-tools/constraints");
const simple_schema_1 = require("@xml-tools/simple-schema");
const validation_1 = require("@xml-tools/validation");
const xml_converters_1 = require("./xml-converters");
class XmlService extends base_service_1.BaseService {
    constructor(mode) {
        super(mode);
        this.schemas = {};
        this.serviceCapabilities = {
            diagnosticProvider: {
                interFileDependencies: true,
                workspaceDiagnostics: true
            }
        };
    }
    addDocument(document) {
        super.addDocument(document);
        this.$configureService(document.uri);
    }
    $getXmlSchemaUri(sessionID) {
        return this.getOption(sessionID, "schemaUri");
    }
    $configureService(sessionID) {
        let schemas = this.getOption(sessionID, "schemas");
        schemas === null || schemas === void 0 ? void 0 : schemas.forEach((el) => {
            var _a, _b;
            if (el.uri === this.$getXmlSchemaUri(sessionID)) {
                (_a = el.fileMatch) !== null && _a !== void 0 ? _a : (el.fileMatch = []);
                el.fileMatch.push(sessionID);
            }
            let schema = (_b = el.schema) !== null && _b !== void 0 ? _b : this.schemas[el.uri];
            if (schema)
                this.schemas[el.uri] = schema;
            el.schema = undefined;
        });
    }
    $getSchema(sessionId) {
        let schemaId = this.$getXmlSchemaUri(sessionId);
        if (schemaId && this.schemas[schemaId]) {
            return JSON.parse(this.schemas[schemaId]);
        }
    }
    async doValidation(document) {
        let fullDocument = this.getDocument(document.uri);
        if (!fullDocument)
            return [];
        const { cst, tokenVector, lexErrors, parseErrors } = (0, parser_1.parse)(fullDocument.getText());
        const xmlDoc = (0, ast_1.buildAst)(cst, tokenVector);
        const constraintsIssues = (0, constraints_1.checkConstraints)(xmlDoc);
        let schema = this.$getSchema(document.uri);
        let schemaIssues = [];
        if (schema) {
            const schemaValidators = (0, simple_schema_1.getSchemaValidators)(schema);
            schemaIssues = (0, validation_1.validate)({
                doc: xmlDoc,
                validators: {
                    attribute: [schemaValidators.attribute],
                    element: [schemaValidators.element],
                },
            });
        }
        return [
            ...(0, xml_converters_1.lexingErrorsToDiagnostic)(lexErrors, fullDocument, this.optionsToFilterDiagnostics),
            ...(0, xml_converters_1.parsingErrorsToDiagnostic)(parseErrors, fullDocument, this.optionsToFilterDiagnostics),
            ...(0, xml_converters_1.issuesToDiagnostic)(constraintsIssues, fullDocument, this.optionsToFilterDiagnostics),
            ...(0, xml_converters_1.issuesToDiagnostic)(schemaIssues, fullDocument, this.optionsToFilterDiagnostics)
        ];
    }
}
exports.XmlService = XmlService;
//# sourceMappingURL=xml-service.js.map