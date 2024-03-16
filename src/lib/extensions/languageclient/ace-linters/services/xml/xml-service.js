import { BaseService } from "../base-service";
import { parse } from "@xml-tools/parser";
import { buildAst } from "@xml-tools/ast";
import { checkConstraints } from "@xml-tools/constraints";
import { getSchemaValidators } from "@xml-tools/simple-schema";
import { validate } from "@xml-tools/validation";
import { issuesToDiagnostic, lexingErrorsToDiagnostic, parsingErrorsToDiagnostic } from "./xml-converters";
export class XmlService extends BaseService {
    $service;
    schemas = {};
    serviceCapabilities = {
        diagnosticProvider: {
            interFileDependencies: true,
            workspaceDiagnostics: true
        }
    };
    constructor(mode) {
        super(mode);
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
        schemas?.forEach((el) => {
            if (el.uri === this.$getXmlSchemaUri(sessionID)) {
                el.fileMatch ??= [];
                el.fileMatch.push(sessionID);
            }
            let schema = el.schema ?? this.schemas[el.uri];
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
        const { cst, tokenVector, lexErrors, parseErrors } = parse(fullDocument.getText());
        const xmlDoc = buildAst(cst, tokenVector);
        const constraintsIssues = checkConstraints(xmlDoc);
        let schema = this.$getSchema(document.uri);
        let schemaIssues = [];
        if (schema) {
            const schemaValidators = getSchemaValidators(schema);
            schemaIssues = validate({
                doc: xmlDoc,
                validators: {
                    attribute: [schemaValidators.attribute],
                    element: [schemaValidators.element],
                },
            });
        }
        return [
            ...lexingErrorsToDiagnostic(lexErrors, fullDocument, this.optionsToFilterDiagnostics),
            ...parsingErrorsToDiagnostic(parseErrors, fullDocument, this.optionsToFilterDiagnostics),
            ...issuesToDiagnostic(constraintsIssues, fullDocument, this.optionsToFilterDiagnostics),
            ...issuesToDiagnostic(schemaIssues, fullDocument, this.optionsToFilterDiagnostics)
        ];
    }
}
