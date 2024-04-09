import Url from "utils/Url";
import { BaseService } from "../base-service";
import { promises as fs } from "fileSystem/wrapper";
import * as jsonService from "vscode-json-languageservice";
import { filterDiagnostics } from "../../type-converters/lsp-converters";
export class JsonService extends BaseService {
  $service;
  schemas = {};
  serviceCapabilities = {
    completionProvider: {
      triggerCharacters: ['"', ":"]
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
  constructor(mode) {
    super(mode);
    this.$service = jsonService.getLanguageService({
      schemaRequestService: url => {
        let uri = url.replace("file:///", "");
        let jsonSchema = this.schemas[uri];
        if (jsonSchema) return Promise.resolve(jsonSchema);
        if (uri.startsWith("acode://")) {
          return fs.readFile(
            Url.join(DATA_STORAGE, "schemas", url.substring(8)),
            { encoding: "utf-8" }
          );
        }
        return new Promise((res, rej) => {
          fetch(url)
            .then(resp => resp.text())
            .then(res)
            .catch(rej);
        });
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
    let schemas = this.getOption(sessionID ?? "", "schemas");
    let sessionIDs = sessionID ? [] : Object.keys(this.documents);
    schemas?.forEach(el => {
      if (sessionID) {
        if (this.$getJsonSchemaUri(sessionID) == el.uri) {
          el.fileMatch ??= [];
          el.fileMatch.push(sessionID);
        }
      } else {
        el.fileMatch = sessionIDs.filter(
          sessionID => this.$getJsonSchemaUri(sessionID) == el.uri
        );
      }
      let schema = el.schema ?? this.schemas[el.uri];
      if (schema) this.schemas[el.uri] = schema;
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
    schemas?.forEach(el => {
      if (el.uri === this.$getJsonSchemaUri(document.uri)) {
        el.fileMatch = el.fileMatch?.filter(pattern => pattern != document.uri);
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
    if (!fullDocument) return Promise.resolve([]);
    return Promise.resolve(this.$service.format(fullDocument, range, options));
  }
  findDocumentSymbols(document) {
    let fullDocument = this.getDocument(document.uri);
    if (!fullDocument) return null;
    let jsonDocument = this.$service.parseJSONDocument(fullDocument);
    return this.$service.findDocumentSymbols(fullDocument, jsonDocument);
  }
  async doHover(document, position) {
    let fullDocument = this.getDocument(document.uri);
    if (!fullDocument) return null;
    let jsonDocument = this.$service.parseJSONDocument(fullDocument);
    return this.$service.doHover(fullDocument, position, jsonDocument);
  }
  async doValidation(document) {
    let fullDocument = this.getDocument(document.uri);
    if (!fullDocument) return [];
    let jsonDocument = this.$service.parseJSONDocument(fullDocument);
    let diagnostics = await this.$service.doValidation(
      fullDocument,
      jsonDocument,
      { trailingCommas: this.mode === "json5" ? "ignore" : "error" }
    );
    return filterDiagnostics(diagnostics, this.optionsToFilterDiagnostics);
  }
  async doComplete(document, position) {
    let fullDocument = this.getDocument(document.uri);
    if (!fullDocument) return null;
    let jsonDocument = this.$service.parseJSONDocument(fullDocument);
    return this.$service.doComplete(fullDocument, position, jsonDocument);
  }
  async doResolve(item) {
    return this.$service.doResolve(item);
  }
}
