"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageClient = void 0;
const rpc = __importStar(require("vscode-ws-jsonrpc"));
const lsp = __importStar(require("vscode-languageserver-protocol"));
const browser_1 = require("vscode-languageserver-protocol/browser");
const base_service_1 = require("./base-service");
const message_types_1 = require("../message-types");
const utils_1 = require("../../../utils");
class LanguageClient extends base_service_1.BaseService {
    constructor(serviceData, ctx) {
        super(serviceData.modes);
        this.isConnected = false;
        this.isInitialized = false;
        this.requestsQueue = [];
        this.clientCapabilities = {
            textDocument: {
                hover: {
                    dynamicRegistration: true,
                    contentFormat: ["markdown", "plaintext"]
                },
                synchronization: {
                    dynamicRegistration: true,
                    willSave: true,
                    didSave: true,
                    willSaveWaitUntil: false
                },
                formatting: {
                    dynamicRegistration: true
                },
                codeAction: {
                    dynamicRegistration: true,
                    dataSupport: true,
                    resolveSupport: { properties: ["edit"] }
                },
                definition: {
                    dynamicRegistration: true,
                    linkSupport: false
                },
                declaration: {
                    dynamicRegistration: true
                },
                references: {
                    dynamicRegistration: true
                },
                typeDefinition: {
                    dynamicRegistration: true,
                    linkSupport: false
                },
                implementation: {
                    dynamicRegistration: true,
                    linkSupport: false
                },
                rename: {
                    dynamicRegistration: true,
                    prepareSupport: true,
                    honorsChangeAnnotations: true
                },
                rangeFormatting: {
                    dynamicRegistration: true,
                    rangesSupport: false
                },
                completion: {
                    dynamicRegistration: true,
                    completionItem: {
                        snippetSupport: true,
                        commitCharactersSupport: false,
                        documentationFormat: ["markdown", "plaintext"],
                        deprecatedSupport: true,
                        preselectSupport: false
                    },
                    contextSupport: false
                },
                signatureHelp: {
                    signatureInformation: {
                        documentationFormat: ["markdown", "plaintext"],
                        activeParameterSupport: true
                    }
                },
                codeLens: {
                    dynamicRegistration: true
                },
                documentHighlight: {
                    dynamicRegistration: true
                },
                diagnostic: {
                    dynamicRegistration: true
                },
                documentSymbol: {
                    dynamicRegistration: true,
                    labelSupport: true
                },
                publishDiagnostics: {
                    codeDescriptionSupport: true,
                    relatedInformation: true
                },
                inlineCompletion: {
                    dynamicRegistration: true
                }
            },
            workspace: {
                didChangeConfiguration: {
                    dynamicRegistration: true
                }
            },
            window: {
                workDoneProgress: true
            }
        };
        this.ctx = ctx;
        this.serviceData = serviceData;
        this.serviceData.features = this.setDefaultFeaturesState(this.serviceData.features);
        switch (serviceData.type) {
            case "webworker":
                if ("worker" in serviceData) {
                    this.$connectWorker(serviceData.worker, serviceData.initializationOptions);
                }
                else {
                    throw new Error("No worker provided");
                }
                break;
            case "socket":
                if ("socket" in serviceData) {
                    this.socket = serviceData.socket;
                    this.$connectSocket(serviceData.initializationOptions);
                }
                else {
                    throw new Error("No socketUrl provided");
                }
                break;
            case "stdio":
                if ("command" in serviceData) {
                    this.$connectWorker((0, utils_1.commandAsWorker)(serviceData.command), serviceData.initializationOptions);
                }
                else {
                    throw new Error("No command provided");
                }
                break;
            default:
                throw new Error("Unknown server type: " + serviceData.type);
        }
    }
    setDefaultFeaturesState(serviceFeatures) {
        var _a, _b, _c, _d, _e, _f, _g;
        let features = serviceFeatures !== null && serviceFeatures !== void 0 ? serviceFeatures : {};
        (_a = features.hover) !== null && _a !== void 0 ? _a : (features.hover = true);
        (_b = features.completion) !== null && _b !== void 0 ? _b : (features.completion = true);
        (_c = features.completionResolve) !== null && _c !== void 0 ? _c : (features.completionResolve = true);
        (_d = features.format) !== null && _d !== void 0 ? _d : (features.format = true);
        (_e = features.diagnostics) !== null && _e !== void 0 ? _e : (features.diagnostics = true);
        (_f = features.signatureHelp) !== null && _f !== void 0 ? _f : (features.signatureHelp = true);
        (_g = features.documentHighlight) !== null && _g !== void 0 ? _g : (features.documentHighlight = true);
        return features;
    }
    $connectSocket(initializationOptions) {
        var _a, _b;
        rpc.listen({
            webSocket: this.socket,
            onConnection: (connection) => {
                this.$connect(connection, initializationOptions);
            }
        });
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.dispatchEvent(new Event("open"));
            (_b = (_a = this.socket).onopen) === null || _b === void 0 ? void 0 : _b.call(_a, new Event("open"));
        }
    }
    $connectWorker(worker, initializationOptions) {
        const connection = (0, browser_1.createProtocolConnection)(new browser_1.BrowserMessageReader(worker), new browser_1.BrowserMessageWriter(worker));
        this.$connect(connection, initializationOptions);
    }
    $connect(connection, initializationOptions) {
        // console.log(this.isConnected, this.requestsQueue);
        if (this.connection) {
            this.connection.dispose();
        }
        if (this.isConnected) {
            this.requestsQueue.push(() => {
                for (let uri in this.documents) {
                    let document = this.documents[uri];
                    const textDocumentMessage = {
                        textDocument: {
                            uri: document.uri,
                            version: document.version,
                            text: document.getText(),
                            languageId: document.languageId
                        }
                    };
                    this.connection.sendNotification("textDocument/didOpen", textDocumentMessage);
                }
            });
        }
        this.isConnected = true;
        this.connection = connection;
        this.connection.listen();
        this.sendInitialize(initializationOptions);
        (0, utils_1.setupProgressHandler)(this);
        this.connection.onNotification("textDocument/publishDiagnostics", (result) => {
            let postMessage = {
                type: message_types_1.MessageType.validate,
                sessionId: result.uri,
                value: result.diagnostics
            };
            this.$diagnostics = result.diagnostics;
            this.ctx.postMessage(postMessage);
        });
        this.connection.onNotification("window/showMessage", (params) => {
            this.showLog(params);
        });
        // For Java Language Server (jdtls)
        this.connection.onNotification("language/status", (params) => {
            console.info("[" + params.type + "] ", params.message);
        });
        this.connection.onNotification("window/logMessage", (params) => {
            this.showLog(params);
        });
        this.connection.onNotification("$/logTrace", (params) => {
            this.showTrace(params);
        });
        this.connection.onRequest("window/showMessageRequest", (params) => {
            this.showLog(params);
        });
        this.connection.onRequest("workspace/configuration", (params) => {
            console.log(params);
        });
        // this.connection.onRequest("window/workDoneProgress/create", params => {
        //   let targetLoader = loader.create("Lua Server Progress");
        //   progress.set(params.token);
        // });
        // this.connection.onRequest("window/workDoneProgress/cancel", params => {
        //   let targetLoader = progress.get(params.token);
        //   if (targetLoader) {
        //     targetLoader.hide();
        //   }
        // });
        this.connection.onRequest("client/registerCapability", params => {
            // console.log(params);
            for (let { method } of params.registrations) {
                let key, value = true;
                switch (method) {
                    default:
                        key = method.replace("textDocument/", "") + "Provider";
                }
                if (key) {
                    this.serviceCapabilities[key] = value;
                }
            }
        });
        this.connection.onError(e => {
            throw e;
        });
        this.connection.onClose(() => {
            this.isConnected = false;
        });
    }
    showLog(params) {
        switch (params.type) {
            case 1:
                console.error(params.message);
                break;
            case 2:
                console.warn(params.message);
                break;
            case 3:
                console.info(params.message);
                break;
            case 4:
            default:
                console.log(params.message);
                break;
        }
    }
    showTrace(params) {
        console.log(params.message);
        if (params.verbose) {
            console.log(params.verbose);
        }
    }
    addDocument(document) {
        super.addDocument(document);
        const textDocumentMessage = {
            textDocument: {
                ...document,
                version: 1
            }
        };
        this.enqueueIfNotConnected(() => {
            var _a, _b;
            this.connection.sendNotification("textDocument/didOpen", textDocumentMessage);
            (_b = (_a = this.ctx).dispatchEvent) === null || _b === void 0 ? void 0 : _b.call(_a, "addDocument", textDocumentMessage);
        });
    }
    enqueueIfNotConnected(callback) {
        if (!this.isConnected) {
            this.requestsQueue.push(callback);
        }
        else {
            callback();
        }
    }
    removeDocument(document) {
        super.removeDocument(document);
        this.enqueueIfNotConnected(() => this.connection.sendNotification("textDocument/didClose", {
            textDocument: {
                uri: document.uri
            }
        }));
    }
    dispose() {
        if (this.connection) {
            this.connection.dispose();
        }
        // if (this.socket) this.socket.close();
    }
    sendInitialize(initializationOptions) {
        var _a, _b, _c;
        if (!this.isConnected) {
            return;
        }
        let rootUri = this.serviceData.rootUri;
        let folders = this.serviceData.workspaceFolders;
        if (rootUri && typeof rootUri == "function") {
            rootUri = rootUri();
        }
        if (folders && typeof folders == "function") {
            folders = folders();
        }
        const message = {
            capabilities: this.clientCapabilities,
            initializationOptions: initializationOptions,
            processId: null,
            rootUri: rootUri || "",
            workspaceFolders: folders
        };
        let mode = ((_a = this.serviceData.options) === null || _a === void 0 ? void 0 : _a.alias) || this.serviceData.modes.split("|")[0];
        (0, utils_1.showToast)("Initializing " + mode + " language server...");
        (_c = (_b = this.ctx).dispatchEvent) === null || _c === void 0 ? void 0 : _c.call(_b, "initialize", this);
        this.connection
            .sendRequest("initialize", message)
            .then((params) => {
            var _a, _b;
            this.isInitialized = true;
            this.serviceCapabilities =
                params.capabilities;
            (0, utils_1.showToast)("Initialized " + mode + " language server.");
            (_b = (_a = this.ctx).dispatchEvent) === null || _b === void 0 ? void 0 : _b.call(_a, "initialized", { lsp: this, params });
            this.connection.sendNotification("initialized", {}).then(() => {
                this.connection.sendNotification("workspace/didChangeConfiguration", {
                    settings: {}
                });
                this.requestsQueue.forEach(requestCallback => requestCallback());
                this.requestsQueue = [];
            });
        });
    }
    applyDeltas(identifier, deltas) {
        super.applyDeltas(identifier, deltas);
        if (!this.isConnected) {
            return;
        }
        if (!(this.serviceCapabilities &&
            this.serviceCapabilities.textDocumentSync !==
                lsp.TextDocumentSyncKind.Incremental)) {
            return this.setValue(identifier, this.getDocument(identifier.uri).getText());
        }
        const textDocumentChange = {
            textDocument: {
                uri: identifier.uri,
                version: identifier.version
            },
            contentChanges: deltas
        };
        this.connection.sendNotification("textDocument/didChange", textDocumentChange);
    }
    setValue(identifier, value) {
        super.setValue(identifier, value);
        if (!this.isConnected) {
            return;
        }
        const textDocumentChange = {
            textDocument: {
                uri: identifier.uri,
                version: identifier.version
            },
            contentChanges: [{ text: value }]
        };
        this.connection.sendNotification("textDocument/didChange", textDocumentChange);
    }
    async doHover(document, position) {
        var _a;
        if (!this.isInitialized) {
            return null;
        }
        if (!((_a = this.serviceCapabilities) === null || _a === void 0 ? void 0 : _a.hoverProvider)) {
            return null;
        }
        let options = {
            textDocument: {
                uri: document.uri
            },
            position: position
        };
        return this.connection.sendRequest("textDocument/hover", options);
    }
    async doComplete(document, position) {
        var _a;
        if (!this.isInitialized) {
            return null;
        }
        if (!((_a = this.serviceCapabilities) === null || _a === void 0 ? void 0 : _a.completionProvider)) {
            return null;
        }
        let options = {
            textDocument: {
                uri: document.uri
            },
            position: position
        };
        return this.connection.sendRequest("textDocument/completion", options);
    }
    async doResolve(item) {
        var _a, _b;
        if (!this.isInitialized)
            return null;
        if (!((_b = (_a = this.serviceCapabilities) === null || _a === void 0 ? void 0 : _a.completionProvider) === null || _b === void 0 ? void 0 : _b.resolveProvider))
            return null;
        return this.connection.sendRequest("completionItem/resolve", item["item"]);
    }
    async doValidation(document) {
        //TODO: textDocument/diagnostic capability
        console.log("Doing validation.");
        return this.$diagnostics;
    }
    async format(document, range, format) {
        if (!this.isInitialized) {
            return [];
        }
        if (!(this.serviceCapabilities &&
            (this.serviceCapabilities.documentRangeFormattingProvider ||
                this.serviceCapabilities.documentFormattingProvider))) {
            return [];
        }
        if (!this.serviceCapabilities.documentRangeFormattingProvider) {
            let options = {
                textDocument: {
                    uri: document.uri
                },
                options: format
            };
            return this.connection.sendRequest("textDocument/formatting", options);
        }
        else {
            let options = {
                textDocument: {
                    uri: document.uri
                },
                options: format,
                range: range
            };
            return this.connection.sendRequest("textDocument/rangeFormatting", options);
        }
    }
    setGlobalOptions(options) {
        super.setGlobalOptions(options);
        if (!this.isConnected) {
            this.requestsQueue.push(() => this.setGlobalOptions(options));
            return;
        }
        const configChanges = {
            settings: options
        };
        this.connection.sendNotification("workspace/didChangeConfiguration", configChanges);
    }
    async findDocumentHighlights(document, position) {
        var _a;
        if (!this.isInitialized)
            return [];
        if (!((_a = this.serviceCapabilities) === null || _a === void 0 ? void 0 : _a.documentHighlightProvider))
            return [];
        let options = {
            textDocument: {
                uri: document.uri
            },
            position: position
        };
        return this.connection.sendRequest("textDocument/documentHighlight", options);
    }
    async provideSignatureHelp(document, position) {
        var _a;
        if (!this.isInitialized)
            return null;
        if (!((_a = this.serviceCapabilities) === null || _a === void 0 ? void 0 : _a.signatureHelpProvider))
            return null;
        let options = {
            textDocument: {
                uri: document.uri
            },
            position: position
        };
        return this.connection.sendRequest("textDocument/signatureHelp", options);
    }
}
exports.LanguageClient = LanguageClient;
//# sourceMappingURL=language-client.js.map