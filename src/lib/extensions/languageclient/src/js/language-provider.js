"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageProvider = void 0;
const common_converters_1 = require("./type-converters/common-converters");
const message_controller_1 = require("./message-controller");
const lsp_converters_1 = require("./type-converters/lsp-converters");
const showdown_1 = __importDefault(require("showdown"));
const cdn_worker_1 = require("./cdn-worker");
const signature_tooltip_1 = require("./components/signature-tooltip");
const marker_group_1 = require("./ace/marker_group");
const range_singleton_1 = require("./ace/range-singleton");
const hover_tooltip_1 = require("./ace/hover-tooltip");
const utils_js_1 = require("../../utils.js");
class LanguageProvider {
    constructor(messageController, options) {
        var _a, _b;
        var _c, _d;
        this.$sessionLanguageProviders = {};
        this.editors = [];
        this.format = () => {
            if (!this.options.functionality.format)
                return;
            let sessionLanguageProvider = this.$getSessionLanguageProvider(this.activeEditor.session);
            sessionLanguageProvider.$sendDeltaQueue(sessionLanguageProvider.format);
        };
        this.$messageController = messageController;
        this.options = options !== null && options !== void 0 ? options : {};
        (_a = (_c = this.options).functionality) !== null && _a !== void 0 ? _a : (_c.functionality = {
            hover: true,
            completion: {
                overwriteCompleters: true
            },
            completionResolve: true,
            format: true,
            documentHighlights: true,
            signatureHelp: true
        });
        (_b = (_d = this.options).markdownConverter) !== null && _b !== void 0 ? _b : (_d.markdownConverter = new showdown_1.default.Converter());
        this.$signatureTooltip = new signature_tooltip_1.SignatureTooltip(this);
    }
    /**
     *  Creates LanguageProvider using our transport protocol with ability to register different services on same
     *  webworker
     * @param {Worker} worker
     * @param {ProviderOptions} options
     */
    static create(worker, options) {
        let messageController;
        messageController = new message_controller_1.MessageController(worker);
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
            worker = (0, cdn_worker_1.createWorker)(source);
        }
        else {
            if (source.includeDefaultLinters == undefined) {
                source.includeDefaultLinters = true;
            }
            worker = (0, cdn_worker_1.createWorker)({
                services: source.services,
                serviceManagerCdn: source.serviceManagerCdn
            }, source.includeDefaultLinters);
        }
        messageController = new message_controller_1.MessageController(worker);
        return new LanguageProvider(messageController, options);
    }
    $registerSession(session, editor, options) {
        var _a;
        var _b, _c;
        (_a = (_b = this.$sessionLanguageProviders)[_c = session["id"]]) !== null && _a !== void 0 ? _a : (_b[_c] = new SessionLanguageProvider(session, editor, this.$messageController, options));
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
        var _a;
        this.editors.push(editor);
        //init Range singleton
        range_singleton_1.AceRange.getConstructor(editor);
        editor.setOption("useWorker", false);
        editor.on("changeSession", ({ session }) => this.$registerSession(session, editor));
        if (this.options.functionality.completion) {
            this.$registerCompleters(editor);
        }
        (_a = this.activeEditor) !== null && _a !== void 0 ? _a : (this.activeEditor = editor);
        editor.on("focus", () => {
            this.activeEditor = editor;
        });
        if (this.options.functionality.documentHighlights) {
            var $timer;
            // @ts-ignore
            editor.on("changeSelection", () => {
                if (!$timer)
                    $timer = setTimeout(() => {
                        let cursor = editor.getCursorPosition();
                        let sessionLanguageProvider = this.$getSessionLanguageProvider(editor.session);
                        this.$messageController.findDocumentHighlights(this.$getFileName(editor.session), (0, lsp_converters_1.fromPoint)(cursor), sessionLanguageProvider.$applyDocumentHighlight);
                        $timer = undefined;
                    }, 50);
            });
        }
        if (this.options.functionality.hover) {
            if (!this.$hoverTooltip) {
                this.$hoverTooltip = new hover_tooltip_1.HoverTooltip();
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
                var _a, _b;
                if (!hover)
                    return;
                var errorMarker = (_b = (_a = this.$getSessionLanguageProvider(session).state) === null || _a === void 0 ? void 0 : _a.diagnosticMarkers) === null || _b === void 0 ? void 0 : _b.getMarkerAtPosition(docPos);
                if (!errorMarker && !(hover === null || hover === void 0 ? void 0 : hover.content))
                    return;
                var range = (hover === null || hover === void 0 ? void 0 : hover.range) || (errorMarker === null || errorMarker === void 0 ? void 0 : errorMarker.range);
                const Range = editor.getSelectionRange().constructor;
                range = range
                    ? Range.fromPoints(range.start, range.end)
                    : session.getWordRange(docPos.row, docPos.column);
                var hoverNode = hover && document.createElement("div");
                if (hoverNode) {
                    // todo render markdown using ace markdown mode
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
  background-color: rgba(53,53,53,0.688) !important;
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
    border: solid 1px #888;
    z-index: 2000;
}

.language_highlight_write {
    border: solid 1px #F88;
}`, "linters.css");
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
        this.$messageController.doHover(this.$getFileName(session), (0, lsp_converters_1.fromPoint)(position), hover => callback && callback((0, lsp_converters_1.toTooltip)(hover)));
    }
    provideSignatureHelp(session, position, callback) {
        this.$messageController.provideSignatureHelp(this.$getFileName(session), (0, lsp_converters_1.fromPoint)(position), signatureHelp => callback && callback((0, lsp_converters_1.fromSignatureHelp)(signatureHelp)));
    }
    getTooltipText(hover) {
        return hover.content.type === "markdown"
            ? common_converters_1.CommonConverter.cleanHtml(this.options.markdownConverter.makeHtml(hover.content.text))
            : hover.content.text;
    }
    doComplete(editor, session, callback) {
        let cursor = editor.getCursorPosition();
        this.$messageController.doComplete(this.$getFileName(session), (0, lsp_converters_1.fromPoint)(cursor), completions => completions && callback((0, lsp_converters_1.toCompletions)(completions)));
    }
    doResolve(item, callback) {
        this.$messageController.doResolve(item["fileName"], (0, lsp_converters_1.toCompletionItem)(item), callback);
    }
    $registerCompleters(editor) {
        let completer = {
            getCompletions: async (editor, session, pos, prefix, callback) => {
                this.$getSessionLanguageProvider(session).$sendDeltaQueue(() => {
                    this.doComplete(editor, session, completions => {
                        let fileName = this.$getFileName(session);
                        if (!completions)
                            return;
                        completions.forEach(item => {
                            item.completerId = completer.id;
                            item["fileName"] = fileName;
                        });
                        callback(null, common_converters_1.CommonConverter.normalizeRanges(completions));
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
                        let completion = (0, lsp_converters_1.toResolvedCompletion)(item, completionItem);
                        item.docText = completion.docText;
                        if (completion.docHTML) {
                            item.docHTML = completion.docHTML;
                        }
                        else if (completion["docMarkdown"]) {
                            item.docHTML = common_converters_1.CommonConverter.cleanHtml(this.options.markdownConverter.makeHtml(completion["docMarkdown"]));
                        }
                        if (editor["completer"]) {
                            editor["completer"].updateDocTooltip();
                        }
                    });
                }
                return item;
            },
            id: "lspCompleters"
        };
        // if (
        //   this.options.functionality.completion &&
        //   this.options.functionality.completion.overwriteCompleters
        // ) {
        //   editor.completers = [completer];
        // } else {
        // }
        if (!editor.completers) {
            editor.completers = [];
        }
        editor.completers.push(completer);
    }
    dispose() {
        // this.$messageController.dispose(this.$fileName);
    }
    /**
     * Removes document from all linked services by session id
     * @param session
     */
    closeDocument(session, callback) {
        let sessionProvider = this.$getSessionLanguageProvider(session);
        if (sessionProvider) {
            sessionProvider.dispose(callback);
            delete this.$sessionLanguageProviders[session["id"]];
        }
    }
}
exports.LanguageProvider = LanguageProvider;
class SessionLanguageProvider {
    constructor(session, editor, messageController, options) {
        this.$isConnected = false;
        this.$modeIsChanged = false;
        this.state = {
            occurrenceMarkers: null,
            diagnosticMarkers: null
        };
        this.extensions = {
            typescript: "ts",
            javascript: "js",
            python: "py"
        };
        this.$extensionToMode = {
            vue: "html"
        };
        this.$connected = (capabilities) => {
            this.$isConnected = true;
            // @ts-ignore
            this.session.on("changeMode", this.$changeMode);
            this.setServerCapabilities(capabilities);
            if (this.$modeIsChanged)
                this.$changeMode();
            if (this.$deltaQueue)
                this.$sendDeltaQueue();
            if (this.$options)
                this.setOptions(this.$options);
        };
        this.$changeMode = () => {
            if (!this.$isConnected) {
                this.$modeIsChanged = true;
                return;
            }
            this.$deltaQueue = [];
            this.$messageController.changeMode(this.fileName, this.session.getValue(), this.$mode, this.setServerCapabilities);
        };
        this.setServerCapabilities = (capabilities) => {
            //TODO: this need to take into account all capabilities from all services
            this.$servicesCapabilities = capabilities;
            if (capabilities &&
                capabilities.some(capability => { var _a; return (_a = capability === null || capability === void 0 ? void 0 : capability.completionProvider) === null || _a === void 0 ? void 0 : _a.triggerCharacters; })) {
                let completer = this.editor.completers.find(completer => completer.id === "lspCompleters");
                if (completer) {
                    let allTriggerCharacters = capabilities.reduce((acc, capability) => {
                        var _a;
                        if ((_a = capability.completionProvider) === null || _a === void 0 ? void 0 : _a.triggerCharacters) {
                            return [...acc, ...capability.completionProvider.triggerCharacters];
                        }
                        return acc;
                    }, []);
                    allTriggerCharacters = [...new Set(allTriggerCharacters)];
                    completer.triggerCharacters = allTriggerCharacters;
                }
            }
        };
        this.$changeListener = delta => {
            this.session.doc["version"]++;
            if (!this.$deltaQueue) {
                this.$deltaQueue = [];
                setTimeout(this.$sendDeltaQueue, 0);
            }
            this.$deltaQueue.push(delta);
        };
        this.$sendDeltaQueue = (callback) => {
            let deltas = this.$deltaQueue;
            if (!deltas)
                return callback && callback();
            this.$deltaQueue = null;
            if (deltas.length)
                this.$messageController.change(this.fileName, deltas.map(delta => (0, lsp_converters_1.fromAceDelta)(delta, this.session.doc.getNewLineCharacter())), this.session.doc, callback);
        };
        this.$showAnnotations = (diagnostics) => {
            this.session.clearAnnotations();
            let annotations = (0, lsp_converters_1.toAnnotations)(diagnostics);
            if (annotations && annotations.length > 0) {
                this.session.setAnnotations(annotations);
            }
            if (!this.state.diagnosticMarkers) {
                this.state.diagnosticMarkers = new marker_group_1.MarkerGroup(this.session);
            }
            this.state.diagnosticMarkers.setMarkers(diagnostics.map(el => (0, lsp_converters_1.toMarkerGroupItem)(common_converters_1.CommonConverter.toRange((0, lsp_converters_1.toRange)(el.range)), "language_highlight_error", el.message)));
        };
        this.validate = () => {
            this.$messageController.doValidation(this.fileName, this.$showAnnotations);
        };
        this.format = () => {
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
                this.$messageController.format(this.fileName, (0, lsp_converters_1.fromRange)(range), $format, this.$applyFormat);
            }
        };
        this.$applyFormat = (edits) => {
            for (let edit of edits.reverse()) {
                this.session.replace((0, lsp_converters_1.toRange)(edit.range), edit.newText);
            }
        };
        this.$applyDocumentHighlight = (documentHighlights) => {
            if (!this.state.occurrenceMarkers) {
                this.state.occurrenceMarkers = new marker_group_1.MarkerGroup(this.session);
            }
            if (documentHighlights) {
                //some servers return null, which contradicts spec
                this.state.occurrenceMarkers.setMarkers((0, lsp_converters_1.fromDocumentHighlights)(documentHighlights));
            }
        };
        this.$messageController = messageController;
        this.session = session;
        this.editor = editor;
        // this.initFileName();
        session.doc["version"] = 0;
        session.doc.on("change", this.$changeListener, true);
        this.$messageController.init(this.fileName, session.doc, this.$mode, options, this.$connected, this.$showAnnotations);
    }
    get fileName() {
        let name = (0, utils_js_1.getFolderName)(this.session["id"]);
        if (name)
            return "file://" + name;
        return this.session["id"] + "." + this.$extension;
    }
    get $extension() {
        var _a;
        let mode = this.$mode.replace("ace/mode/", "");
        return (_a = this.extensions[mode]) !== null && _a !== void 0 ? _a : mode;
    }
    get $mode() {
        let fileName = (0, utils_js_1.getFolderName)(this.session["id"]);
        if (fileName) {
            let extension = (0, utils_js_1.getExtension)(fileName);
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
    setOptions(options) {
        if (!this.$isConnected) {
            this.$options = options;
            return;
        }
        this.$messageController.changeOptions(this.fileName, options);
    }
    dispose(callback) {
        this.$messageController.dispose(this.fileName, callback);
    }
}
//# sourceMappingURL=language-provider.js.map