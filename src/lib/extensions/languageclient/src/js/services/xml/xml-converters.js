"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.issuesToDiagnostic = exports.parsingErrorsToDiagnostic = exports.lexingErrorsToDiagnostic = void 0;
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
const utils_1 = require("../../utils");
const common_converters_1 = require("../../type-converters/common-converters");
function lexingErrorsToDiagnostic(errors, document, filterErrors) {
    return common_converters_1.CommonConverter.excludeByErrorMessage(errors, filterErrors.errorMessagesToIgnore).map((el) => {
        return {
            message: el.message,
            range: vscode_languageserver_protocol_1.Range.create(document.positionAt(el.offset), document.positionAt(el.offset + el.length)),
            severity: determineDiagnosticSeverity(el.message, filterErrors, el.severity),
        };
    });
}
exports.lexingErrorsToDiagnostic = lexingErrorsToDiagnostic;
function parsingErrorsToDiagnostic(errors, document, filterErrors) {
    return common_converters_1.CommonConverter.excludeByErrorMessage(errors, filterErrors.errorMessagesToIgnore).map((el) => {
        var _a;
        return {
            message: el.message,
            range: vscode_languageserver_protocol_1.Range.create(document.positionAt(el.token.startOffset), document.positionAt((_a = el.token.endOffset) !== null && _a !== void 0 ? _a : 0)),
            severity: determineDiagnosticSeverity(el.message, filterErrors, el.severity),
        };
    });
}
exports.parsingErrorsToDiagnostic = parsingErrorsToDiagnostic;
function issuesToDiagnostic(errors, document, filterErrors) {
    return common_converters_1.CommonConverter.excludeByErrorMessage(errors, filterErrors.errorMessagesToIgnore, "msg").map((el) => {
        return {
            message: el.msg,
            range: {
                start: document.positionAt(el.position.startOffset),
                // Chevrotain Token positions are non-inclusive for endOffsets
                end: document.positionAt(el.position.endOffset + 1),
            },
            severity: determineDiagnosticSeverity(el.msg, filterErrors, el.severity),
        };
    });
}
exports.issuesToDiagnostic = issuesToDiagnostic;
function toDiagnosticSeverity(issueSeverity) {
    if (!issueSeverity)
        return vscode_languageserver_protocol_1.DiagnosticSeverity.Error;
    switch (issueSeverity) {
        case "error":
            return vscode_languageserver_protocol_1.DiagnosticSeverity.Error;
        case "warning":
            return vscode_languageserver_protocol_1.DiagnosticSeverity.Warning;
        case "info":
        default:
            return vscode_languageserver_protocol_1.DiagnosticSeverity.Information;
    }
}
function determineDiagnosticSeverity(message, filterErrors, issueSeverity) {
    let severity;
    if ((0, utils_1.checkValueAgainstRegexpArray)(message, filterErrors.errorMessagesToTreatAsWarning)) {
        severity = vscode_languageserver_protocol_1.DiagnosticSeverity.Warning;
    }
    else if ((0, utils_1.checkValueAgainstRegexpArray)(message, filterErrors.errorMessagesToTreatAsInfo)) {
        severity = vscode_languageserver_protocol_1.DiagnosticSeverity.Information;
    }
    else {
        severity = toDiagnosticSeverity(issueSeverity);
    }
    return severity;
}
//# sourceMappingURL=xml-converters.js.map