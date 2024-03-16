import * as rpc from "vscode-ws-jsonrpc";
import * as lsp from "vscode-languageserver-protocol";
import {
  BrowserMessageReader,
  BrowserMessageWriter,
  createProtocolConnection
} from "vscode-languageserver-protocol/browser";
import { BaseService } from "./base-service";
import { MessageType } from "../message-types";
import { commandAsWorker, showToast, setupProgressHandler } from "../../utils";
export class LanguageClient extends BaseService {
  $service;
  socket;
  isConnected = false;
  isInitialized = false;
  connection;
  requestsQueue = [];
  serviceData;
  $diagnostics;
  clientCapabilities = {
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
  ctx;
  constructor(serviceData, ctx) {
    super(serviceData.modes);
    this.ctx = ctx;
    this.serviceData = serviceData;
    this.serviceData.features = this.setDefaultFeaturesState(
      this.serviceData.features
    );
    switch (serviceData.type) {
      case "webworker":
        if ("worker" in serviceData) {
          this.$connectWorker(
            serviceData.worker,
            serviceData.initializationOptions
          );
        } else {
          throw new Error("No worker provided");
        }
        break;
      case "socket":
        if ("socket" in serviceData) {
          this.socket = serviceData.socket;
          this.$connectSocket(serviceData.initializationOptions);
        } else {
          throw new Error("No socketUrl provided");
        }
        break;
      case "stdio":
        if ("command" in serviceData) {
          this.$connection = commandAsWorker(
            serviceData.command,
            serviceData.args
          );
          if (this.$connection.state === WebSocket.OPEN) {
            this.$connectWorker(
              this.$connection,
              serviceData.initializationOptions
            );
          } else {
            this.$connection.addEventListener("open", () => {
              this.$connectWorker(
                this.$connection,
                serviceData.initializationOptions
              );
            });
          }
        } else {
          throw new Error("No command provided");
        }
        break;
      default:
        throw new Error("Unknown server type: " + serviceData.type);
    }
  }
  setDefaultFeaturesState(serviceFeatures) {
    let features = serviceFeatures ?? {};
    features.hover ??= true;
    features.completion ??= true;
    features.completionResolve ??= true;
    features.format ??= true;
    features.diagnostics ??= true;
    features.signatureHelp ??= true;
    features.documentHighlight ??= true;
    return features;
  }
  $connectSocket(initializationOptions) {
    rpc.listen({
      webSocket: this.socket,
      onConnection: connection => {
        this.$connect(connection, initializationOptions);
      }
    });
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.dispatchEvent(new Event("open"));
      this.socket.onopen?.(new Event("open"));
    }
  }
  $connectWorker(worker, initializationOptions) {
    const connection = createProtocolConnection(
      new BrowserMessageReader(worker),
      new BrowserMessageWriter(worker)
    );
    this.$connect(connection, initializationOptions);
  }
  $connect(connection, initializationOptions) {
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
          this.connection.sendNotification(
            "textDocument/didOpen",
            textDocumentMessage
          );
        }
      });
    }
    this.isConnected = true;
    this.connection = connection;
    this.connection.listen();
    this.sendInitialize(initializationOptions);
    setupProgressHandler(this);
    this.connection.onNotification(
      "textDocument/publishDiagnostics",
      result => {
        let postMessage = {
          type: MessageType.validate,
          sessionId: result.uri,
          value: result.diagnostics
        };
        this.$diagnostics = result.diagnostics;
        this.ctx.postMessage(postMessage);
      }
    );
    this.connection.onNotification("window/showMessage", params => {
      this.showLog(params);
    });
    this.connection.onNotification("language/status", params => {
      console.info("[" + params.type + "] ", params.message);
    });
    this.connection.onNotification("window/logMessage", params => {
      this.showLog(params);
    });
    this.connection.onNotification("$/logTrace", params => {
      this.showTrace(params);
    });
    this.connection.onRequest("window/showMessageRequest", params => {
      this.showLog(params);
    });
    this.connection.onRequest("workspace/configuration", params => {
      console.log(params);
    });
    this.connection.onRequest("client/registerCapability", params => {
      for (let { method } of params.registrations) {
        let key,
          value = true;
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
      this.connection.sendNotification(
        "textDocument/didOpen",
        textDocumentMessage
      );
      this.ctx.dispatchEvent?.("addDocument", textDocumentMessage);
    });
  }
  enqueueIfNotConnected(callback) {
    if (!this.isConnected) {
      this.requestsQueue.push(callback);
    } else {
      callback();
    }
  }
  removeDocument(document) {
    super.removeDocument(document);
    this.enqueueIfNotConnected(() =>
      this.connection.sendNotification("textDocument/didClose", {
        textDocument: {
          uri: document.uri
        }
      })
    );
  }
  dispose() {
    if (this.connection) {
      this.connection.dispose();
    }
  }
  sendInitialize(initializationOptions) {
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
    let mode =
      this.serviceData.options?.alias || this.serviceData.modes.split("|")[0];

    showToast("Initializing " + mode + " language server...");
    this.ctx.dispatchEvent?.("initialize", this);
    this.connection.sendRequest("initialize", message).then(params => {
      this.isInitialized = true;
      this.serviceCapabilities = params.capabilities;
      showToast("Initialized " + mode + " language server.");
      this.ctx.dispatchEvent?.("initialized", { lsp: this, params });
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
    if (
      !(
        this.serviceCapabilities &&
        this.serviceCapabilities.textDocumentSync !==
          lsp.TextDocumentSyncKind.Incremental
      )
    ) {
      return this.setValue(
        identifier,
        this.getDocument(identifier.uri).getText()
      );
    }
    const textDocumentChange = {
      textDocument: {
        uri: identifier.uri,
        version: identifier.version
      },
      contentChanges: deltas
    };
    this.connection.sendNotification(
      "textDocument/didChange",
      textDocumentChange
    );
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
    this.connection.sendNotification(
      "textDocument/didChange",
      textDocumentChange
    );
  }
  async doHover(document, position) {
    if (!this.isInitialized) {
      return null;
    }
    if (!this.serviceCapabilities?.hoverProvider) {
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
    if (!this.isInitialized) {
      return null;
    }
    if (!this.serviceCapabilities?.completionProvider) {
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
    if (!this.isInitialized) return null;
    if (!this.serviceCapabilities?.completionProvider?.resolveProvider)
      return null;
    return this.connection.sendRequest("completionItem/resolve", item["item"]);
  }
  async doValidation(document) {
    console.log("Doing validation.");
    return this.$diagnostics;
  }
  async format(document, range, format) {
    if (!this.isInitialized) {
      return [];
    }
    if (
      !(
        this.serviceCapabilities &&
        (this.serviceCapabilities.documentRangeFormattingProvider ||
          this.serviceCapabilities.documentFormattingProvider)
      )
    ) {
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
    } else {
      let options = {
        textDocument: {
          uri: document.uri
        },
        options: format,
        range: range
      };
      return this.connection.sendRequest(
        "textDocument/rangeFormatting",
        options
      );
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
    this.connection.sendNotification(
      "workspace/didChangeConfiguration",
      configChanges
    );
  }
  async findDocumentHighlights(document, position) {
    if (!this.isInitialized) return [];
    if (!this.serviceCapabilities?.documentHighlightProvider) return [];
    let options = {
      textDocument: {
        uri: document.uri
      },
      position: position
    };
    return this.connection.sendRequest(
      "textDocument/documentHighlight",
      options
    );
  }
  async provideSignatureHelp(document, position) {
    if (!this.isInitialized) return null;
    if (!this.serviceCapabilities?.signatureHelpProvider) return null;
    let options = {
      textDocument: {
        uri: document.uri
      },
      position: position
    };
    return this.connection.sendRequest("textDocument/signatureHelp", options);
  }
}
