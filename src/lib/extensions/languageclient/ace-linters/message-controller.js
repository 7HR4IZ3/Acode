import { ChangeMessage, ChangeModeMessage, ChangeOptionsMessage, CompleteMessage, DeltasMessage, DisposeMessage, DocumentHighlightMessage, FormatMessage, GlobalOptionsMessage, HoverMessage, InitMessage, MessageType, ResolveCompletionMessage, SignatureHelpMessage, ConfigureFeaturesMessage, ValidateMessage } from "./message-types";
import EventEmitter from "events";
export class MessageController extends EventEmitter {
    $worker;
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
        this.on(MessageType.validate.toString() + "-" + sessionId, validationCallback);
        this.postMessage(new InitMessage(sessionId, document.getValue(), document["version"] || 1, mode, options), initCallback);
    }
    doValidation(sessionId, callback) {
        this.postMessage(new ValidateMessage(sessionId), callback);
    }
    doComplete(sessionId, position, callback) {
        this.postMessage(new CompleteMessage(sessionId, position), callback);
    }
    doResolve(sessionId, completion, callback) {
        this.postMessage(new ResolveCompletionMessage(sessionId, completion), callback);
    }
    format(sessionId, range, format, callback) {
        this.postMessage(new FormatMessage(sessionId, range, format), callback);
    }
    doHover(sessionId, position, callback) {
        this.postMessage(new HoverMessage(sessionId, position), callback);
    }
    change(sessionId, deltas, document, callback) {
        let message;
        if (deltas.length > 50 && deltas.length > document.getLength() >> 1) {
            message = new ChangeMessage(sessionId, document.getValue(), document["version"]);
        }
        else {
            message = new DeltasMessage(sessionId, deltas, document["version"]);
        }
        this.postMessage(message, callback);
    }
    changeMode(sessionId, value, mode, callback) {
        this.postMessage(new ChangeModeMessage(sessionId, value, mode), callback);
    }
    changeOptions(sessionId, options, callback, merge = false) {
        this.postMessage(new ChangeOptionsMessage(sessionId, options, merge), callback);
    }
    dispose(sessionId, callback) {
        this.postMessage(new DisposeMessage(sessionId), callback);
    }
    setGlobalOptions(serviceName, options, merge = false) {
        this.$worker.postMessage(new GlobalOptionsMessage(serviceName, options, merge));
    }
    provideSignatureHelp(sessionId, position, callback) {
        this.postMessage(new SignatureHelpMessage(sessionId, position), callback);
    }
    findDocumentHighlights(sessionId, position, callback) {
        this.postMessage(new DocumentHighlightMessage(sessionId, position), callback);
    }
    configureFeatures(serviceName, features) {
        this.$worker.postMessage(new ConfigureFeaturesMessage(serviceName, features));
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
