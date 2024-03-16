import { CompletionItemKind } from "vscode-languageserver-protocol";
import { checkValueAgainstRegexpArray } from "../utils";
import { AceRange } from "../ace/range-singleton";
export var CommonConverter;
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
        let Range = AceRange.getConstructor();
        return Range.fromPoints(range.start, range.end);
    }
    CommonConverter.toRange = toRange;
    function convertKind(kind) {
        switch (kind) {
            case "primitiveType":
            case "keyword":
                return CompletionItemKind.Keyword;
            case "variable":
            case "localVariable":
                return CompletionItemKind.Variable;
            case "memberVariable":
            case "memberGetAccessor":
            case "memberSetAccessor":
                return CompletionItemKind.Field;
            case "function":
            case "memberFunction":
            case "constructSignature":
            case "callSignature":
            case "indexSignature":
                return CompletionItemKind.Function;
            case "enum":
                return CompletionItemKind.Enum;
            case "module":
                return CompletionItemKind.Module;
            case "class":
                return CompletionItemKind.Class;
            case "interface":
                return CompletionItemKind.Interface;
            case "warning":
                return CompletionItemKind.File;
        }
        return CompletionItemKind.Property;
    }
    CommonConverter.convertKind = convertKind;
    function excludeByErrorMessage(diagnostics, errorMessagesToIgnore, fieldName = "message") {
        if (!errorMessagesToIgnore)
            return diagnostics;
        return diagnostics.filter((el) => !checkValueAgainstRegexpArray(el[fieldName], errorMessagesToIgnore));
    }
    CommonConverter.excludeByErrorMessage = excludeByErrorMessage;
})(CommonConverter || (CommonConverter = {}));
