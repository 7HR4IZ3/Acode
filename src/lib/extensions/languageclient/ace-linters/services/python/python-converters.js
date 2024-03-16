import { DiagnosticSeverity } from "vscode-languageserver-protocol";
export function toRange(location, endLocation) {
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
export function toDiagnostics(diagnostics, filterErrors) {
    return diagnostics.filter((el) => !filterErrors.errorCodesToIgnore.includes(el.code)).map((el) => {
        let severity = DiagnosticSeverity.Error;
        if (filterErrors.errorCodesToTreatAsWarning.includes(el.code)) {
            severity = DiagnosticSeverity.Warning;
        }
        else if (filterErrors.errorCodesToTreatAsInfo.includes(el.code)) {
            severity = DiagnosticSeverity.Information;
        }
        return {
            message: el.code + " " + el.message,
            range: toRange(el.location, el.end_location),
            severity: severity,
        };
    });
}
