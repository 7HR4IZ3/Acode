"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toDiagnostics = exports.toRange = void 0;
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
function toRange(location, endLocation) {
    return {
        start: {
            line: Math.max(location.row - 1, 0),
            character: location.column
        },
        end: {
            line: Math.max(endLocation.row - 1, 0),
            character: endLocation.column
        }
    };
}
exports.toRange = toRange;
function toDiagnostics(diagnostics, filterErrors) {
    return diagnostics.filter((el) => !filterErrors.errorCodesToIgnore.includes(el.code)).map((el) => {
        let severity = vscode_languageserver_protocol_1.DiagnosticSeverity.Error;
        if (filterErrors.errorCodesToTreatAsWarning.includes(el.code)) {
            severity = vscode_languageserver_protocol_1.DiagnosticSeverity.Warning;
        }
        else if (filterErrors.errorCodesToTreatAsInfo.includes(el.code)) {
            severity = vscode_languageserver_protocol_1.DiagnosticSeverity.Information;
        }
        return {
            message: el.code + " " + el.message,
            range: toRange(el.location, el.end_location),
            severity: severity,
        };
    });
}
exports.toDiagnostics = toDiagnostics;
//# sourceMappingURL=python-converters.js.map