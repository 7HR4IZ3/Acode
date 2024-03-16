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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PythonService = void 0;
const base_service_1 = require("../base-service");
const pkg_1 = __importStar(require("./pkg"));
const python_converters_1 = require("./python-converters");
const ruff_wasm_bg_wasm_1 = __importDefault(require("./pkg/ruff_wasm_bg.wasm"));
class PythonService extends base_service_1.BaseService {
    constructor(mode) {
        super(mode);
        this.serviceCapabilities = {
            diagnosticProvider: {
                interFileDependencies: true,
                workspaceDiagnostics: true
            }
        };
    }
    async init() {
        this.initOutput = await (0, pkg_1.default)(ruff_wasm_bg_wasm_1.default);
    }
    async doValidation(document) {
        var _a;
        let value = this.getDocumentValue(document.uri);
        if (!value)
            return [];
        if (!this.initOutput)
            await this.init();
        let options = (_a = this.getOption(document.uri, "configuration")) !== null && _a !== void 0 ? _a : (0, pkg_1.defaultSettings)();
        let diagnostics = (0, pkg_1.check)(value, options);
        return (0, python_converters_1.toDiagnostics)(diagnostics, this.optionsToFilterDiagnostics);
    }
}
exports.PythonService = PythonService;
//# sourceMappingURL=python-service.js.map