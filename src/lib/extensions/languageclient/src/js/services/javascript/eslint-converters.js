"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toDiagnostics = exports.toDiagnostic = void 0;
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
const common_converters_1 = require("../../type-converters/common-converters");
const utils_1 = require("../../utils");
function toDiagnostic(error, filterErrors) {
    let severity;
    if ((0, utils_1.checkValueAgainstRegexpArray)(error.message, filterErrors.errorMessagesToTreatAsWarning)) {
        severity = vscode_languageserver_protocol_1.DiagnosticSeverity.Warning;
    }
    else if ((0, utils_1.checkValueAgainstRegexpArray)(error.message, filterErrors.errorMessagesToTreatAsInfo)) {
        severity = vscode_languageserver_protocol_1.DiagnosticSeverity.Information;
    }
    else {
        severity = (error.fatal) ? vscode_languageserver_protocol_1.DiagnosticSeverity.Error : error.severity;
    }
    return {
        message: error.message,
        range: {
            start: {
                line: error.line - 1,
                character: error.column - 1
            },
            end: {
                line: error.endLine - 1,
                character: error.endColumn - 1
            }
        },
        severity: severity,
    };
}
exports.toDiagnostic = toDiagnostic;
function toDiagnostics(diagnostics, filterErrors) {
    if (!diagnostics) {
        return [];
    }
    return common_converters_1.CommonConverter.excludeByErrorMessage(diagnostics).map((error) => toDiagnostic(error, filterErrors));
}
exports.toDiagnostics = toDiagnostics;
//# sourceMappingURL=eslint-converters.js.map