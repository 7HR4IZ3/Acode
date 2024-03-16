"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageController = void 0;
const message_types_1 = require("./message-types");
const events_1 = __importDefault(require("events"));
class MessageController extends events_1.default {
    constructor(worker) {
        super();
        this.setMaxListeners(50);
        this.$worker = worker;
        this.$worker.addEventListener("message", (e) => {
            let message = e.data;
            this.emit(message.type + "-" + message.sessionId, message.value);
        });
    }
    init(sessionId, document, mode, options, initCallback, validationCallback) {
        this.on(message_types_1.MessageType.validate.toString() + "-" + sessionId, validationCallback);
        this.postMessage(new message_types_1.InitMessage(sessionId, document.getValue(), document["version"] || 1, mode, options), initCallback);
    }
    doValidation(sessionId, callback) {
        this.postMessage(new message_types_1.ValidateMessage(sessionId), callback);
    }
    doComplete(sessionId, position, callback) {
        this.postMessage(new message_types_1.CompleteMessage(sessionId, position), callback);
    }
    doResolve(sessionId, completion, callback) {
        this.postMessage(new message_types_1.ResolveCompletionMessage(sessionId, completion), callback);
    }
    format(sessionId, range, format, callback) {
        this.postMessage(new message_types_1.FormatMessage(sessionId, range, format), callback);
    }
    doHover(sessionId, position, callback) {
        this.postMessage(new message_types_1.HoverMessage(sessionId, position), callback);
    }
    change(sessionId, deltas, document, callback) {
        let message;
        if (deltas.length > 50 && deltas.length > document.getLength() >> 1) {
            message = new message_types_1.ChangeMessage(sessionId, document.getValue(), document["version"]);
        }
        else {
            message = new message_types_1.DeltasMessage(sessionId, deltas, document["version"]);
        }
        this.postMessage(message, callback);
    }
    changeMode(sessionId, value, mode, callback) {
        this.postMessage(new message_types_1.ChangeModeMessage(sessionId, value, mode), callback);
    }
    changeOptions(sessionId, options, callback, merge = false) {
        this.postMessage(new message_types_1.ChangeOptionsMessage(sessionId, options, merge), callback);
    }
    dispose(sessionId, callback) {
        this.postMessage(new message_types_1.DisposeMessage(sessionId), callback);
    }
    setGlobalOptions(serviceName, options, merge = false) {
        // @ts-ignore
        this.$worker.postMessage(new message_types_1.GlobalOptionsMessage(serviceName, options, merge));
    }
    provideSignatureHelp(sessionId, position, callback) {
        this.postMessage(new message_types_1.SignatureHelpMessage(sessionId, position), callback);
    }
    findDocumentHighlights(sessionId, position, callback) {
        this.postMessage(new message_types_1.DocumentHighlightMessage(sessionId, position), callback);
    }
    configureFeatures(serviceName, features) {
        this.$worker.postMessage(new message_types_1.ConfigureFeaturesMessage(serviceName, features));
    }
    postMessage(message, callback) {
        if (callback) {
            let eventName = message.type.toString() + "-" + message.sessionId;
            let callbackFunction = (data) => {
                this.off(eventName, callbackFunction);
                callback(data);
            };
            this.on(eventName, callbackFunction);
        }
        this.$worker.postMessage(message);
    }
}
exports.MessageController = MessageController;
//# sourceMappingURL=message-controller.js.map