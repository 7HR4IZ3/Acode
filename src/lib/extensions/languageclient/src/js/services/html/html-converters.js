"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toDiagnostics = void 0;
const utils_1 = require("../../utils");
const common_converters_1 = require("../../type-converters/common-converters");
function toDiagnostics(diagnostics, filterErrors) {
    return common_converters_1.CommonConverter.excludeByErrorMessage(diagnostics, filterErrors.errorMessagesToIgnore).map((el) => {
        let severity;
        if ((0, utils_1.checkValueAgainstRegexpArray)(el.message, filterErrors.errorMessagesToTreatAsWarning)) {
            severity = 2;
        }
        else if ((0, utils_1.checkValueAgainstRegexpArray)(el.message, filterErrors.errorMessagesToTreatAsInfo)) {
            severity = 3;
        }
        else {
            severity = el.type === "error" ? 1 : el.type === "warning" ? 2 : 3;
        }
        return {
            range: {
                start: {
                    line: el.line - 1,
                    character: el.col - 1
                },
                end: {
                    line: el.line - 1,
                    character: el.col - 1
                }
            },
            severity: severity,
            message: el.message
        };
    });
}
exports.toDiagnostics = toDiagnostics;
//# sourceMappingURL=html-converters.js.map