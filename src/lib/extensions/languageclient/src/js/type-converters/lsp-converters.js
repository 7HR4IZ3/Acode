"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toMarkerGroupItem = exports.fromDocumentHighlights = exports.filterDiagnostics = exports.fromAceDelta = exports.fromMarkupContent = exports.fromSignatureHelp = exports.toTooltip = exports.getTextEditRange = exports.toCompletionItem = exports.toResolvedCompletion = exports.toCompletions = exports.toCompletion = exports.toAnnotations = exports.toPoint = exports.fromPoint = exports.toRange = exports.rangeFromPositions = exports.fromRange = void 0;
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
const common_converters_1 = require("./common-converters");
const utils_1 = require("../utils");
const utils_2 = require("../utils");
function fromRange(range) {
    return {
        start: {
            line: range.start.row,
            character: range.start.column
        },
        end: { line: range.end.row, character: range.end.column }
    };
}
exports.fromRange = fromRange;
function rangeFromPositions(start, end) {
    return {
        start: start,
        end: end
    };
}
exports.rangeFromPositions = rangeFromPositions;
function toRange(range) {
    return {
        start: {
            row: range.start.line,
            column: range.start.character
        },
        end: {
            row: range.end.line,
            column: range.end.character
        }
    };
}
exports.toRange = toRange;
function fromPoint(point) {
    return { line: point.row, character: point.column };
}
exports.fromPoint = fromPoint;
function toPoint(position) {
    return { row: position.line, column: position.character };
}
exports.toPoint = toPoint;
function toAnnotations(diagnostics) {
    return diagnostics.map((el) => {
        return {
            row: el.range.start.line,
            column: el.range.start.character,
            text: el.message,
            type: el.severity === 1 ? "error" : el.severity === 2 ? "warning" : "info"
        };
    });
}
exports.toAnnotations = toAnnotations;
function toCompletion(item) {
    var _a, _b, _c, _d;
    let itemKind = item.kind;
    let kind = itemKind ? Object.keys(vscode_languageserver_protocol_1.CompletionItemKind)[Object.values(vscode_languageserver_protocol_1.CompletionItemKind).indexOf(itemKind)] : undefined;
    let text = (_c = (_b = (_a = item.textEdit) === null || _a === void 0 ? void 0 : _a.newText) !== null && _b !== void 0 ? _b : item.insertText) !== null && _c !== void 0 ? _c : item.label;
    let command = (((_d = item.command) === null || _d === void 0 ? void 0 : _d.command) == "editor.action.triggerSuggest") ? "startAutocomplete" : undefined;
    let range = item.textEdit ? getTextEditRange(item.textEdit) : undefined;
    let completion = {
        meta: kind,
        caption: item.label,
        score: undefined
    };
    completion["command"] = command;
    completion["range"] = range;
    completion["item"] = item;
    if (item.insertTextFormat == vscode_languageserver_protocol_1.InsertTextFormat.Snippet) {
        completion["snippet"] = text;
    }
    else {
        completion["value"] = text !== null && text !== void 0 ? text : "";
    }
    completion["documentation"] = item.documentation; //TODO: this is workaround for services with instant completion
    completion["position"] = item["position"];
    completion["service"] = item["service"]; //TODO: since we have multiple servers, we need to determine which
    // server to use for resolving
    return completion;
}
exports.toCompletion = toCompletion;
function toCompletions(completions) {
    if (completions.length > 0) {
        let combinedCompletions = completions.map((el) => {
            if (!el.completions) {
                return [];
            }
            let allCompletions;
            if (Array.isArray(el.completions)) {
                allCompletions = el.completions;
            }
            else {
                allCompletions = el.completions.items;
            }
            return allCompletions.map((item) => {
                item["service"] = el.service;
                return item;
            });
        }).flat();
        return combinedCompletions.map((item) => toCompletion(item));
    }
    return [];
}
exports.toCompletions = toCompletions;
function toResolvedCompletion(completion, item) {
    completion["docMarkdown"] = fromMarkupContent(item.documentation);
    return completion;
}
exports.toResolvedCompletion = toResolvedCompletion;
function toCompletionItem(completion) {
    var _a, _b, _c;
    let command;
    if (completion["command"]) {
        command = {
            title: "triggerSuggest",
            command: completion["command"]
        };
    }
    let completionItem = {
        label: (_a = completion.caption) !== null && _a !== void 0 ? _a : "",
        kind: common_converters_1.CommonConverter.convertKind(completion.meta),
        command: command,
        insertTextFormat: (completion["snippet"]) ? vscode_languageserver_protocol_1.InsertTextFormat.Snippet : vscode_languageserver_protocol_1.InsertTextFormat.PlainText,
        documentation: completion["documentation"],
    };
    if (completion["range"]) {
        completionItem.textEdit = {
            range: fromRange(completion["range"]),
            newText: ((_b = completion["snippet"]) !== null && _b !== void 0 ? _b : completion["value"])
        };
    }
    else {
        completionItem.insertText = ((_c = completion["snippet"]) !== null && _c !== void 0 ? _c : completion["value"]);
    }
    completionItem["fileName"] = completion["fileName"];
    completionItem["position"] = completion["position"];
    completionItem["item"] = completion["item"];
    completionItem["service"] = completion["service"]; //TODO:
    return completionItem;
}
exports.toCompletionItem = toCompletionItem;
function getTextEditRange(textEdit) {
    if (textEdit.hasOwnProperty("insert") && textEdit.hasOwnProperty("replace")) {
        textEdit = textEdit;
        let mergedRanges = (0, utils_2.mergeRanges)([toRange(textEdit.insert), toRange(textEdit.replace)]);
        return mergedRanges[0];
    }
    else {
        textEdit = textEdit;
        return toRange(textEdit.range);
    }
}
exports.getTextEditRange = getTextEditRange;
function toTooltip(hover) {
    var _a;
    if (!hover)
        return;
    let content = hover.map((el) => {
        if (!el || !el.contents)
            return;
        if (vscode_languageserver_protocol_1.MarkupContent.is(el.contents)) {
            return fromMarkupContent(el.contents);
        }
        else if (vscode_languageserver_protocol_1.MarkedString.is(el.contents)) {
            if (typeof el.contents === "string") {
                return el.contents;
            }
            return "```" + el.contents.value + "```";
        }
        else {
            let contents = el.contents.map((el) => {
                if (typeof el !== "string") {
                    return `\`\`\`${el.value}\`\`\``;
                }
                else {
                    return el;
                }
            });
            return contents.join("\n\n");
        }
    }).filter(utils_1.notEmpty);
    if (content.length === 0)
        return;
    //TODO: it could be merged within all ranges in future
    let lspRange = (_a = hover.find((el) => el === null || el === void 0 ? void 0 : el.range)) === null || _a === void 0 ? void 0 : _a.range;
    let range;
    if (lspRange)
        range = toRange(lspRange);
    return {
        content: {
            type: "markdown",
            text: content.join("\n\n")
        },
        range: range
    };
}
exports.toTooltip = toTooltip;
function fromSignatureHelp(signatureHelp) {
    if (!signatureHelp)
        return;
    let content = signatureHelp.map((el) => {
        if (!el)
            return;
        let signatureIndex = (el === null || el === void 0 ? void 0 : el.activeSignature) || 0;
        let activeSignature = el.signatures[signatureIndex];
        if (!activeSignature)
            return;
        let activeParam = el === null || el === void 0 ? void 0 : el.activeParameter;
        let contents = activeSignature.label;
        if (activeParam != undefined && activeSignature.parameters && activeSignature.parameters[activeParam]) {
            let param = activeSignature.parameters[activeParam].label;
            if (typeof param == "string") {
                contents = contents.replace(param, `**${param}**`);
            }
        }
        if (activeSignature.documentation) {
            if (vscode_languageserver_protocol_1.MarkupContent.is(activeSignature.documentation)) {
                return contents + "\n\n" + fromMarkupContent(activeSignature.documentation);
            }
            else {
                contents += "\n\n" + activeSignature.documentation;
                return contents;
            }
        }
        else {
            return contents;
        }
    }).filter(utils_1.notEmpty);
    if (content.length === 0)
        return;
    return {
        content: {
            type: "markdown",
            text: content.join("\n\n")
        }
    };
}
exports.fromSignatureHelp = fromSignatureHelp;
function fromMarkupContent(content) {
    if (!content)
        return;
    if (typeof content === "string") {
        return content;
    }
    else {
        return content.value;
    }
}
exports.fromMarkupContent = fromMarkupContent;
function fromAceDelta(delta, eol) {
    const text = delta.lines.length > 1 ? delta.lines.join(eol) : delta.lines[0];
    return {
        range: delta.action === "insert"
            ? rangeFromPositions(fromPoint(delta.start), fromPoint(delta.start))
            : rangeFromPositions(fromPoint(delta.start), fromPoint(delta.end)),
        text: delta.action === "insert" ? text : "",
    };
}
exports.fromAceDelta = fromAceDelta;
function filterDiagnostics(diagnostics, filterErrors) {
    return common_converters_1.CommonConverter.excludeByErrorMessage(diagnostics, filterErrors.errorMessagesToIgnore).map((el) => {
        if ((0, utils_1.checkValueAgainstRegexpArray)(el.message, filterErrors.errorMessagesToTreatAsWarning)) {
            el.severity = vscode_languageserver_protocol_1.DiagnosticSeverity.Warning;
        }
        else if ((0, utils_1.checkValueAgainstRegexpArray)(el.message, filterErrors.errorMessagesToTreatAsInfo)) {
            el.severity = vscode_languageserver_protocol_1.DiagnosticSeverity.Information;
        }
        return el;
    });
}
exports.filterDiagnostics = filterDiagnostics;
function fromDocumentHighlights(documentHighlights) {
    return documentHighlights.map(function (el) {
        let className = el.kind == 2
            ? "language_highlight_read"
            : el.kind == 3
                ? "language_highlight_write"
                : "language_highlight_text";
        return toMarkerGroupItem(common_converters_1.CommonConverter.toRange(toRange(el.range)), className);
    });
}
exports.fromDocumentHighlights = fromDocumentHighlights;
function toMarkerGroupItem(range, className, tooltipText) {
    let markerGroupItem = {
        range: range,
        className: className
    };
    if (tooltipText) {
        markerGroupItem["tooltipText"] = tooltipText;
    }
    return markerGroupItem;
}
exports.toMarkerGroupItem = toMarkerGroupItem;
//# sourceMappingURL=lsp-converters.js.map