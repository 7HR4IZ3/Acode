import { CommonConverter } from "./type-converters/common-converters";
import { MessageController } from "./message-controller";
import { fromAceDelta, fromDocumentHighlights, fromPoint, fromRange, fromSignatureHelp, toAnnotations, toCompletionItem, toCompletions, toMarkerGroupItem, toRange, toResolvedCompletion, toTooltip } from "./type-converters/lsp-converters";
import showdown from "showdown";
import { createWorker } from "./cdn-worker";
import { SignatureTooltip } from "./components/signature-tooltip";
import { MarkerGroup } from "./ace/marker_group";
import { AceRange } from "./ace/range-singleton";
import { HoverTooltip } from "./ace/hover-tooltip";
import { getFolderName, getExtension } from "../utils.js";

export class LanguageProvider {
    activeEditor;
    $signatureTooltip;
    $messageController;
    $sessionLanguageProviders = {};
    editors = [];
    options;
    $hoverTooltip;
    constructor(messageController, options) {
        this.$messageController = messageController;
        this.options = options ?? {};
        this.options.functionality ??= {
            hover: true,
            completion: {
                overwriteCompleters: true
            },
            completionResolve: true,
            format: true,
            documentHighlights: true,
            signatureHelp: true
        };
        this.options.markdownConverter ??= new showdown.Converter();
        this.$signatureTooltip = new SignatureTooltip(this);
    }
    static create(worker, options) {
        let messageController;
        messageController = new MessageController(worker);
        return new LanguageProvider(messageController, options);
    }
    static fromCdn(source, options) {
        let messageController;
        let worker;
        if (typeof source === "string") {
            if (source == "" || !/^http(s)?:/.test(source)) {
                throw "Url is not valid";
            }
            if (source[source.length - 1] == "/") {
                source = source.substring(0, source.length - 1);
            }
            worker = createWorker(source);
        }
        else {
            if (source.includeDefaultLinters == undefined) {
                source.includeDefaultLinters = true;
            }
            worker = createWorker({
                services: source.services,
                serviceManagerCdn: source.serviceManagerCdn
            }, source.includeDefaultLinters);
        }
        messageController = new MessageController(worker);
        return new LanguageProvider(messageController, options);
    }
    $registerSession(session, editor, options) {
        this.$sessionLanguageProviders[session["id"]] ??=
            new SessionLanguageProvider(session, editor, this.$messageController, options);
    }
    $getSessionLanguageProvider(session) {
        return this.$sessionLanguageProviders[session["id"]];
    }
    $getFileName(session) {
        let sessionLanguageProvider = this.$getSessionLanguageProvider(session);
        if (!sessionLanguageProvider) {
            this.$registerSession(session, this.editors.find(editor => editor.session == session) ||
                this.editors[0]);
            sessionLanguageProvider = this.$getSessionLanguageProvider(session);
        }
        return sessionLanguageProvider.fileName;
    }
    registerEditor(editor) {
        if (!this.editors.includes(editor))
            this.$registerEditor(editor);
        this.$registerSession(editor.session, editor);
    }
    $registerEditor(editor) {
        this.editors.push(editor);
        AceRange.getConstructor(editor);
        editor.setOption("useWorker", false);
        editor.on("changeSession", ({ session }) => this.$registerSession(session, editor));
        if (this.options.functionality.completion) {
            this.$registerCompleters(editor);
        }
        this.activeEditor ??= editor;
        editor.on("focus", () => {
            this.activeEditor = editor;
        });
        if (this.options.functionality.documentHighlights) {
            var $timer;
            editor.on("changeSelection", () => {
                if (!$timer)
                    $timer = setTimeout(() => {
                        let cursor = editor.getCursorPosition();
                        let sessionLanguageProvider = this.$getSessionLanguageProvider(editor.session);
                        this.$messageController.findDocumentHighlights(this.$getFileName(editor.session), fromPoint(cursor), sessionLanguageProvider.$applyDocumentHighlight);
                        $timer = undefined;
                    }, 50);
            });
        }
        if (this.options.functionality.hover) {
            if (!this.$hoverTooltip) {
                this.$hoverTooltip = new HoverTooltip();
            }
            this.$initHoverTooltip(editor);
        }
        if (this.options.functionality.signatureHelp) {
            this.$signatureTooltip.registerEditor(editor);
        }
        this.setStyle(editor);
    }
    $initHoverTooltip(editor) {
        this.$hoverTooltip.setDataProvider((e, editor) => {
            let session = editor.session;
            let docPos = e.getDocumentPosition();
            this.doHover(session, docPos, hover => {
                if (!hover)
                    return;
                var errorMarker = this.$getSessionLanguageProvider(session).state?.diagnosticMarkers?.getMarkerAtPosition(docPos);
                if (!errorMarker && !hover?.content)
                    return;
                var range = hover?.range || errorMarker?.range;
                const Range = editor.getSelectionRange().constructor;
                range = range
                    ? Range.fromPoints(range.start, range.end)
                    : session.getWordRange(docPos.row, docPos.column);
                var hoverNode = hover && document.createElement("div");
                if (hoverNode) {
                    hoverNode.innerHTML = this.getTooltipText(hover);
                }
                var domNode = document.createElement("div");
                if (errorMarker) {
                    var errorDiv = document.createElement("div");
                    var errorText = document.createTextNode(errorMarker.tooltipText.trim());
                    errorDiv.appendChild(errorText);
                    domNode.appendChild(errorDiv);
                }
                if (hoverNode) {
                    domNode.appendChild(hoverNode);
                }
                this.$hoverTooltip.showForRange(editor, range, domNode, e);
            });
        });
        this.$hoverTooltip.addToEditor(editor);
    }
    setStyle(editor) {
        editor.renderer["$textLayer"].dom.importCssString(`.ace_tooltip * {
    margin: 0;
    font-size: 12px;
}

.ace_tooltip {
  opacity: 7;
  border: 1px solid var(--popup-border-color) !important;
  color: var(--popup-text-color) !important;
  background-color: var(--popup-background-color) !important;
}

.ace_tooltip code {
    font-style: italic;
    font-size: 11px;
}

.language_highlight_error {
    position: absolute;
    border-bottom: dotted 1px #e00404;
    z-index: 2000;
    border-radius: 0;
}

.language_highlight_warning {
    position: absolute;
    border-bottom: solid 1px #DDC50F;
    z-index: 2000;
    border-radius: 0;
}

.language_highlight_info {
    position: absolute;
    border-bottom: dotted 1px #999;
    z-index: 2000;
    border-radius: 0;
}

.language_highlight_text, .language_highlight_read, .language_highlight_write {
    position: absolute;
    box-sizing: border-box;
    border: solid 1px var(--popup-border-color);
    z-index: 2000;
}
`, "linters.css");
    }
    setSessionOptions(session, options) {
        let sessionLanguageProvider = this.$getSessionLanguageProvider(session);
        sessionLanguageProvider.setOptions(options);
    }
    setGlobalOptions(serviceName, options, merge = false) {
        this.$messageController.setGlobalOptions(serviceName, options, merge);
    }
    configureServiceFeatures(serviceName, features) {
        this.$messageController.configureFeatures(serviceName, features);
    }
    doHover(session, position, callback) {
        this.$messageController.doHover(this.$getFileName(session), fromPoint(position), hover => callback && callback(toTooltip(hover)));
    }
    provideSignatureHelp(session, position, callback) {
        this.$messageController.provideSignatureHelp(this.$getFileName(session), fromPoint(position), signatureHelp => callback && callback(fromSignatureHelp(signatureHelp)));
    }
    getTooltipText(hover) {
        return hover.content.type === "markdown"
            ? CommonConverter.cleanHtml(this.options.markdownConverter.makeHtml(hover.content.text))
            : hover.content.text;
    }
    format = () => {
        if (!this.options.functionality.format)
            return;
        let sessionLanguageProvider = this.$getSessionLanguageProvider(this.activeEditor.session);
        sessionLanguageProvider.$sendDeltaQueue(sessionLanguageProvider.format);
    };
    doComplete(editor, session, callback) {
        let cursor = editor.getCursorPosition();
        this.$messageController.doComplete(this.$getFileName(session), fromPoint(cursor), completions => completions && callback(toCompletions(completions)));
    }
    doResolve(item, callback) {
        this.$messageController.doResolve(item["fileName"], toCompletionItem(item), callback);
    }
    $registerCompleters(editor) {
        let completer = {
            getCompletions: async (editor, session, _, __, callback) => {
                this.$getSessionLanguageProvider(session).$sendDeltaQueue(() => {
                    this.doComplete(editor, session, completions => {
                        let fileName = this.$getFileName(session);
                        if (!completions)
                            return;
                        completions.forEach(item => {
                            item.completerId = completer.id;
                            item["fileName"] = fileName;
                        });
                        callback(null, CommonConverter.normalizeRanges(completions));
                    });
                });
            },
            getDocTooltip: (item) => {
                if (this.options.functionality.completionResolve &&
                    !item["isResolved"] &&
                    item.completerId === completer.id) {
                    this.doResolve(item, (completionItem) => {
                        item["isResolved"] = true;
                        if (!completionItem)
                            return;
                        let completion = toResolvedCompletion(item, completionItem);
                        item.docText = completion.docText;
                        if (completion.docHTML) {
                            item.docHTML = completion.docHTML;
                        }
                        else if (completion["docMarkdown"]) {
                            item.docHTML = CommonConverter.cleanHtml(this.options.markdownConverter.makeHtml(completion["docMarkdown"]));
                        }
                        if (editor["completer"]?.completions) {
                            editor["completer"].updateDocTooltip();
                        }
                    });
                }
                return item;
            },
            id: "lspCompleters"
        };
        if (!editor.completers) {
            editor.completers = [];
        }
        editor.completers.push(completer);
    }
    dispose() {
    }
    closeDocument(session, callback) {
        let sessionProvider = this.$getSessionLanguageProvider(session);
        if (sessionProvider) {
            sessionProvider.dispose(callback);
            delete this.$sessionLanguageProviders[session["id"]];
        }
    }
}
class SessionLanguageProvider {
    session;
    $messageController;
    $deltaQueue;
    $isConnected = false;
    $modeIsChanged = false;
    $options;
    $servicesCapabilities;
    state = {
        occurrenceMarkers: null,
        diagnosticMarkers: null
    };
    extensions = {
        typescript: "ts",
        javascript: "js",
        python: "py"
    };
    $extensionToMode = {
    };
    editor;
    constructor(session, editor, messageController, options) {
        this.$messageController = messageController;
        this.session = session;
        this.editor = editor;
        session.doc["version"] = 0;
        session.doc.on("change", this.$changeListener, true);
        this.$messageController.init(this.fileName, session.doc, this.$mode, options, this.$connected, this.$showAnnotations);
    }
    $connected = (capabilities) => {
        this.$isConnected = true;
        this.session.on("changeMode", this.$changeMode);
        this.setServerCapabilities(capabilities);
        if (this.$modeIsChanged)
            this.$changeMode();
        if (this.$deltaQueue)
            this.$sendDeltaQueue();
        if (this.$options)
            this.setOptions(this.$options);
    };
    $changeMode = () => {
        if (!this.$isConnected) {
            this.$modeIsChanged = true;
            return;
        }
        this.$deltaQueue = [];
        this.$messageController.changeMode(this.fileName, this.session.getValue(), this.$mode, this.setServerCapabilities);
    };
    setServerCapabilities = (capabilities) => {
        this.$servicesCapabilities = capabilities;
        if (capabilities &&
            capabilities.some(capability => capability?.completionProvider?.triggerCharacters)) {
            let completer = this.editor.completers.find(completer => completer.id === "lspCompleters");
            if (completer) {
                let allTriggerCharacters = capabilities.reduce((acc, capability) => {
                    if (capability.completionProvider?.triggerCharacters) {
                        return [...acc, ...capability.completionProvider.triggerCharacters];
                    }
                    return acc;
                }, []);
                allTriggerCharacters = [...new Set(allTriggerCharacters)];
                completer.triggerCharacters = allTriggerCharacters;
            }
        }
    };
    get fileName() {
        let name = getFolderName(this.session["id"]);
        if (name)
            return "file://" + name;
        return this.session["id"] + "." + this.$extension;
    }
    get $extension() {
        let mode = this.$mode.replace("ace/mode/", "");
        return this.extensions[mode] ?? mode;
    }
    get $mode() {
        let fileName = getFolderName(this.session["id"]);
        if (fileName) {
            let extension = getExtension(fileName);
            if (this.$extensionToMode[extension]) {
                return this.$extensionToMode[extension];
            }
        }
        return this.session["$modeId"];
    }
    get $format() {
        return {
            tabSize: this.session.getTabSize(),
            insertSpaces: this.session.getUseSoftTabs()
        };
    }
    $changeListener = delta => {
        this.session.doc["version"]++;
        if (!this.$deltaQueue) {
            this.$deltaQueue = [];
            setTimeout(this.$sendDeltaQueue, 0);
        }
        this.$deltaQueue.push(delta);
    };
    $sendDeltaQueue = (callback) => {
        let deltas = this.$deltaQueue;
        if (!deltas)
            return callback && callback();
        this.$deltaQueue = null;
        if (deltas.length)
            this.$messageController.change(this.fileName, deltas.map(delta => fromAceDelta(delta, this.session.doc.getNewLineCharacter())), this.session.doc, callback);
    };
    $showAnnotations = (diagnostics) => {
        this.session.clearAnnotations();
        let annotations = toAnnotations(diagnostics);
        if (annotations && annotations.length > 0) {
            this.session.setAnnotations(annotations);
        }
        if (!this.state.diagnosticMarkers) {
            this.state.diagnosticMarkers = new MarkerGroup(this.session);
        }
        this.state.diagnosticMarkers.setMarkers(diagnostics.map(el => toMarkerGroupItem(CommonConverter.toRange(toRange(el.range)), "language_highlight_error", el.message)));
    };
    setOptions(options) {
        if (!this.$isConnected) {
            this.$options = options;
            return;
        }
        this.$messageController.changeOptions(this.fileName, options);
    }
    validate = () => {
        this.$messageController.doValidation(this.fileName, this.$showAnnotations);
    };
    format = () => {
        let selectionRanges = this.session.getSelection().getAllRanges();
        let $format = this.$format;
        let aceRangeDatas = selectionRanges;
        if (!selectionRanges || selectionRanges[0].isEmpty()) {
            let row = this.session.getLength();
            let column = this.session.getLine(row).length - 1;
            aceRangeDatas = [
                {
                    start: {
                        row: 0,
                        column: 0
                    },
                    end: {
                        row: row,
                        column: column
                    }
                }
            ];
        }
        for (let range of aceRangeDatas) {
            this.$messageController.format(this.fileName, fromRange(range), $format, this.$applyFormat);
        }
    };
    $applyFormat = (edits) => {
        for (let edit of edits?.reverse()) {
            this.session.replace(toRange(edit.range), edit.newText);
        }
    };
    $applyDocumentHighlight = (documentHighlights) => {
        if (!this.state.occurrenceMarkers) {
            this.state.occurrenceMarkers = new MarkerGroup(this.session);
        }
        if (documentHighlights) {
            this.state.occurrenceMarkers.setMarkers(fromDocumentHighlights(documentHighlights));
        }
    };
    dispose(callback) {
        this.$messageController.dispose(this.fileName, callback);
    }
}
