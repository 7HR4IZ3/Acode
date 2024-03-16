import { InsertTextFormat, CompletionItemKind, MarkupContent, MarkedString, DiagnosticSeverity } from "vscode-languageserver-protocol";
import { CommonConverter } from "./common-converters";
import { checkValueAgainstRegexpArray, notEmpty } from "../utils";
import { mergeRanges } from "../utils";
export function fromRange(range) {
    return {
        start: {
            line: range.start.row,
            character: range.start.column
        },
        end: { line: range.end.row, character: range.end.column }
    };
}
export function rangeFromPositions(start, end) {
    return {
        start: start,
        end: end
    };
}
export function toRange(range) {
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
export function fromPoint(point) {
    return { line: point.row, character: point.column };
}
export function toPoint(position) {
    return { row: position.line, column: position.character };
}
export function toAnnotations(diagnostics) {
    return diagnostics.map((el) => {
        return {
            row: el.range.start.line,
            column: el.range.start.character,
            text: el.message,
            type: el.severity === 1 ? "error" : el.severity === 2 ? "warning" : "info"
        };
    });
}
export function toCompletion(item) {
    let itemKind = item.kind;
    let kind = itemKind ? Object.keys(CompletionItemKind)[Object.values(CompletionItemKind).indexOf(itemKind)] : undefined;
    let text = item.textEdit?.newText ?? item.insertText ?? item.label;
    let command = (item.command?.command == "editor.action.triggerSuggest") ? "startAutocomplete" : undefined;
    let range = item.textEdit ? getTextEditRange(item.textEdit) : undefined;
    let completion = {
        meta: kind,
        caption: item.label,
        score: undefined
    };
    completion["command"] = command;
    completion["range"] = range;
    completion["item"] = item;
    if (item.insertTextFormat == InsertTextFormat.Snippet) {
        completion["snippet"] = text;
    }
    else {
        completion["value"] = text ?? "";
    }
    completion["documentation"] = item.documentation;
    completion["position"] = item["position"];
    completion["service"] = item["service"];
    return completion;
}
export function toCompletions(completions) {
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
export function toResolvedCompletion(completion, item) {
    completion["docMarkdown"] = fromMarkupContent(item.documentation);
    return completion;
}
export function toCompletionItem(completion) {
    let command;
    if (completion["command"]) {
        command = {
            title: "triggerSuggest",
            command: completion["command"]
        };
    }
    let completionItem = {
        label: completion.caption ?? "",
        kind: CommonConverter.convertKind(completion.meta),
        command: command,
        insertTextFormat: (completion["snippet"]) ? InsertTextFormat.Snippet : InsertTextFormat.PlainText,
        documentation: completion["documentation"],
    };
    if (completion["range"]) {
        completionItem.textEdit = {
            range: fromRange(completion["range"]),
            newText: (completion["snippet"] ?? completion["value"])
        };
    }
    else {
        completionItem.insertText = (completion["snippet"] ?? completion["value"]);
    }
    completionItem["fileName"] = completion["fileName"];
    completionItem["position"] = completion["position"];
    completionItem["item"] = completion["item"];
    completionItem["service"] = completion["service"];
    return completionItem;
}
export function getTextEditRange(textEdit) {
    if (textEdit.hasOwnProperty("insert") && textEdit.hasOwnProperty("replace")) {
        textEdit = textEdit;
        let mergedRanges = mergeRanges([toRange(textEdit.insert), toRange(textEdit.replace)]);
        return mergedRanges[0];
    }
    else {
        textEdit = textEdit;
        return toRange(textEdit.range);
    }
}
export function toTooltip(hover) {
    if (!hover)
        return;
    let content = hover.map((el) => {
        if (!el || !el.contents)
            return;
        if (MarkupContent.is(el.contents)) {
            return fromMarkupContent(el.contents);
        }
        else if (MarkedString.is(el.contents)) {
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
    }).filter(notEmpty);
    if (content.length === 0)
        return;
    let lspRange = hover.find((el) => el?.range)?.range;
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
export function fromSignatureHelp(signatureHelp) {
    if (!signatureHelp)
        return;
    let content = signatureHelp.map((el) => {
        if (!el)
            return;
        let signatureIndex = el?.activeSignature || 0;
        let activeSignature = el.signatures[signatureIndex];
        if (!activeSignature)
            return;
        let activeParam = el?.activeParameter;
        let contents = activeSignature.label;
        if (activeParam != undefined && activeSignature.parameters && activeSignature.parameters[activeParam]) {
            let param = activeSignature.parameters[activeParam].label;
            if (typeof param == "string") {
                contents = contents.replace(param, `**${param}**`);
            }
        }
        if (activeSignature.documentation) {
            if (MarkupContent.is(activeSignature.documentation)) {
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
    }).filter(notEmpty);
    if (content.length === 0)
        return;
    return {
        content: {
            type: "markdown",
            text: content.join("\n\n")
        }
    };
}
export function fromMarkupContent(content) {
    if (!content)
        return;
    if (typeof content === "string") {
        return content;
    }
    else {
        return content.value;
    }
}
export function fromAceDelta(delta, eol) {
    const text = delta.lines.length > 1 ? delta.lines.join(eol) : delta.lines[0];
    return {
        range: delta.action === "insert"
            ? rangeFromPositions(fromPoint(delta.start), fromPoint(delta.start))
            : rangeFromPositions(fromPoint(delta.start), fromPoint(delta.end)),
        text: delta.action === "insert" ? text : "",
    };
}
export function filterDiagnostics(diagnostics, filterErrors) {
    return CommonConverter.excludeByErrorMessage(diagnostics, filterErrors.errorMessagesToIgnore).map((el) => {
        if (checkValueAgainstRegexpArray(el.message, filterErrors.errorMessagesToTreatAsWarning)) {
            el.severity = DiagnosticSeverity.Warning;
        }
        else if (checkValueAgainstRegexpArray(el.message, filterErrors.errorMessagesToTreatAsInfo)) {
            el.severity = DiagnosticSeverity.Information;
        }
        return el;
    });
}
export function fromDocumentHighlights(documentHighlights) {
    return documentHighlights.map(function (el) {
        let className = el.kind == 2
            ? "language_highlight_read"
            : el.kind == 3
                ? "language_highlight_write"
                : "language_highlight_text";
        return toMarkerGroupItem(CommonConverter.toRange(toRange(el.range)), className);
    });
}
export function toMarkerGroupItem(range, className, tooltipText) {
    let markerGroupItem = {
        range: range,
        className: className
    };
    if (tooltipText) {
        markerGroupItem["tooltipText"] = tooltipText;
    }
    return markerGroupItem;
}
