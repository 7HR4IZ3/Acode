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
exports.LuaService = void 0;
const base_service_1 = require("../base-service");
const lua = __importStar(require("luaparse"));
const lsp_converters_1 = require("../../type-converters/lsp-converters");
class LuaService extends base_service_1.BaseService {
    constructor(mode) {
        super(mode);
        this.serviceCapabilities = {
            diagnosticProvider: {
                interFileDependencies: true,
                workspaceDiagnostics: true
            }
        };
        this.$service = lua;
    }
    async doValidation(document) {
        let value = this.getDocumentValue(document.uri);
        if (!value)
            return [];
        let errors = [];
        try {
            this.$service.parse(value);
        }
        catch (e) {
            if (e instanceof this.$service.SyntaxError) {
                errors.push({
                    range: {
                        start: {
                            line: e.line - 1,
                            character: e.column
                        },
                        end: {
                            line: e.line - 1,
                            character: e.column
                        }
                    },
                    message: e.message,
                    severity: 1
                });
            }
        }
        return (0, lsp_converters_1.filterDiagnostics)(errors, this.optionsToFilterDiagnostics);
    }
}
exports.LuaService = LuaService;
//# sourceMappingURL=lua-service.js.map