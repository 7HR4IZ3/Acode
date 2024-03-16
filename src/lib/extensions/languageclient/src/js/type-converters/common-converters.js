"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonConverter = void 0;
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
const utils_1 = require("../utils");
const range_singleton_1 = require("../ace/range-singleton");
var CommonConverter;
(function (CommonConverter) {
    function normalizeRanges(completions) {
        return completions && completions.map((el) => {
            if (el["range"]) {
                el["range"] = toRange(el["range"]);
            }
            return el;
        });
    }
    CommonConverter.normalizeRanges = normalizeRanges;
    function cleanHtml(html) {
        return html.replace(/<a\s/, "<a target='_blank' ");
    }
    CommonConverter.cleanHtml = cleanHtml;
    function toRange(range) {
        if (!range || !range.start || !range.end) {
            return;
        }
        let Range = range_singleton_1.AceRange.getConstructor();
        // @ts-ignore
        return Range.fromPoints(range.start, range.end);
    }
    CommonConverter.toRange = toRange;
    function convertKind(kind) {
        switch (kind) {
            case "primitiveType":
            case "keyword":
                return vscode_languageserver_protocol_1.CompletionItemKind.Keyword;
            case "variable":
            case "localVariable":
                return vscode_languageserver_protocol_1.CompletionItemKind.Variable;
            case "memberVariable":
            case "memberGetAccessor":
            case "memberSetAccessor":
                return vscode_languageserver_protocol_1.CompletionItemKind.Field;
            case "function":
            case "memberFunction":
            case "constructSignature":
            case "callSignature":
            case "indexSignature":
                return vscode_languageserver_protocol_1.CompletionItemKind.Function;
            case "enum":
                return vscode_languageserver_protocol_1.CompletionItemKind.Enum;
            case "module":
                return vscode_languageserver_protocol_1.CompletionItemKind.Module;
            case "class":
                return vscode_languageserver_protocol_1.CompletionItemKind.Class;
            case "interface":
                return vscode_languageserver_protocol_1.CompletionItemKind.Interface;
            case "warning":
                return vscode_languageserver_protocol_1.CompletionItemKind.File;
        }
        return vscode_languageserver_protocol_1.CompletionItemKind.Property;
    }
    CommonConverter.convertKind = convertKind;
    function excludeByErrorMessage(diagnostics, errorMessagesToIgnore, fieldName = "message") {
        if (!errorMessagesToIgnore)
            return diagnostics;
        return diagnostics.filter((el) => !(0, utils_1.checkValueAgainstRegexpArray)(el[fieldName], errorMessagesToIgnore));
    }
    CommonConverter.excludeByErrorMessage = excludeByErrorMessage;
})(CommonConverter || (exports.CommonConverter = CommonConverter = {}));
//# sourceMappingURL=common-converters.js.map