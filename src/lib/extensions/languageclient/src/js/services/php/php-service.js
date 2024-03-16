"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhpService = void 0;
const base_service_1 = require("../base-service");
const php_1 = require("./lib/php");
const lsp_converters_1 = require("../../type-converters/lsp-converters");
class PhpService extends base_service_1.BaseService {
    constructor(mode) {
        super(mode);
        this.serviceCapabilities = {
            diagnosticProvider: {
                interFileDependencies: true,
                workspaceDiagnostics: true
            }
        };
    }
    async doValidation(document) {
        let value = this.getDocumentValue(document.uri);
        if (!value)
            return [];
        if (this.getOption(document.uri, "inline")) {
            value = "<?" + value + "?>";
        }
        var tokens = php_1.PHP.Lexer(value, { short_open_tag: 1 });
        let errors = [];
        try {
            new php_1.PHP.Parser(tokens);
        }
        catch (e) {
            errors.push({
                range: {
                    start: {
                        line: e.line - 1,
                        character: 0
                    },
                    end: {
                        line: e.line - 1,
                        character: 0
                    }
                },
                message: e.message.charAt(0).toUpperCase() + e.message.substring(1),
                severity: 1
            });
        }
        return (0, lsp_converters_1.filterDiagnostics)(errors, this.optionsToFilterDiagnostics);
    }
}
exports.PhpService = PhpService;
//# sourceMappingURL=php-service.js.map