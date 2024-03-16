import { BaseService } from "../base-service";
import init, { check, defaultSettings, } from "./pkg";
import { toDiagnostics } from "./python-converters";
import ruff_wasm from "./pkg/ruff_wasm_bg.wasm";
export class PythonService extends BaseService {
    $service;
    initOutput;
    serviceCapabilities = {
        diagnosticProvider: {
            interFileDependencies: true,
            workspaceDiagnostics: true
        }
    };
    constructor(mode) {
        super(mode);
    }
    async init() {
        this.initOutput = await init(ruff_wasm);
    }
    async doValidation(document) {
        let value = this.getDocumentValue(document.uri);
        if (!value)
            return [];
        if (!this.initOutput)
            await this.init();
        let options = this.getOption(document.uri, "configuration") ?? defaultSettings();
        let diagnostics = check(value, options);
        return toDiagnostics(diagnostics, this.optionsToFilterDiagnostics);
    }
}
