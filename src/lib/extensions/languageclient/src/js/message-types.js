"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageType = exports.DocumentHighlightMessage = exports.SignatureHelpMessage = exports.ConfigureFeaturesMessage = exports.GlobalOptionsMessage = exports.DisposeMessage = exports.ChangeOptionsMessage = exports.ChangeModeMessage = exports.DeltasMessage = exports.ChangeMessage = exports.ValidateMessage = exports.HoverMessage = exports.ResolveCompletionMessage = exports.CompleteMessage = exports.FormatMessage = exports.InitMessage = exports.BaseMessage = void 0;
class BaseMessage {
    constructor(sessionId) {
        this.sessionId = sessionId;
    }
}
exports.BaseMessage = BaseMessage;
class InitMessage extends BaseMessage {
    constructor(sessionId, value, version, mode, options) {
        super(sessionId);
        this.type = MessageType.init;
        this.version = version;
        this.options = options;
        this.mode = mode;
        this.value = value;
    }
}
exports.InitMessage = InitMessage;
class FormatMessage extends BaseMessage {
    constructor(sessionId, value, format) {
        super(sessionId);
        this.type = MessageType.format;
        this.value = value;
        this.format = format;
    }
}
exports.FormatMessage = FormatMessage;
class CompleteMessage extends BaseMessage {
    constructor(sessionId, value) {
        super(sessionId);
        this.type = MessageType.complete;
        this.value = value;
    }
}
exports.CompleteMessage = CompleteMessage;
class ResolveCompletionMessage extends BaseMessage {
    constructor(sessionId, value) {
        super(sessionId);
        this.type = MessageType.resolveCompletion;
        this.value = value;
    }
}
exports.ResolveCompletionMessage = ResolveCompletionMessage;
class HoverMessage extends BaseMessage {
    constructor(sessionId, value) {
        super(sessionId);
        this.type = MessageType.hover;
        this.value = value;
    }
}
exports.HoverMessage = HoverMessage;
class ValidateMessage extends BaseMessage {
    constructor(sessionId) {
        super(sessionId);
        this.type = MessageType.validate;
    }
}
exports.ValidateMessage = ValidateMessage;
class ChangeMessage extends BaseMessage {
    constructor(sessionId, value, version) {
        super(sessionId);
        this.type = MessageType.change;
        this.value = value;
        this.version = version;
    }
}
exports.ChangeMessage = ChangeMessage;
class DeltasMessage extends BaseMessage {
    constructor(sessionId, value, version) {
        super(sessionId);
        this.type = MessageType.applyDelta;
        this.value = value;
        this.version = version;
    }
}
exports.DeltasMessage = DeltasMessage;
class ChangeModeMessage extends BaseMessage {
    constructor(sessionId, value, mode) {
        super(sessionId);
        this.type = MessageType.changeMode;
        this.value = value;
        this.mode = mode;
    }
}
exports.ChangeModeMessage = ChangeModeMessage;
class ChangeOptionsMessage extends BaseMessage {
    constructor(sessionId, options, merge = false) {
        super(sessionId);
        this.type = MessageType.changeOptions;
        this.options = options;
        this.merge = merge;
    }
}
exports.ChangeOptionsMessage = ChangeOptionsMessage;
class DisposeMessage extends BaseMessage {
    constructor(sessionId) {
        super(sessionId);
        this.type = MessageType.dispose;
    }
}
exports.DisposeMessage = DisposeMessage;
class GlobalOptionsMessage {
    constructor(serviceName, options, merge) {
        this.type = MessageType.globalOptions;
        this.serviceName = serviceName;
        this.options = options;
        this.merge = merge;
    }
}
exports.GlobalOptionsMessage = GlobalOptionsMessage;
class ConfigureFeaturesMessage {
    constructor(serviceName, options) {
        this.type = MessageType.configureFeatures;
        this.serviceName = serviceName;
        this.options = options;
    }
}
exports.ConfigureFeaturesMessage = ConfigureFeaturesMessage;
class SignatureHelpMessage extends BaseMessage {
    constructor(sessionId, value) {
        super(sessionId);
        this.type = MessageType.signatureHelp;
        this.value = value;
    }
}
exports.SignatureHelpMessage = SignatureHelpMessage;
class DocumentHighlightMessage extends BaseMessage {
    constructor(sessionId, value) {
        super(sessionId);
        this.type = MessageType.documentHighlight;
        this.value = value;
    }
}
exports.DocumentHighlightMessage = DocumentHighlightMessage;
var MessageType;
(function (MessageType) {
    MessageType[MessageType["init"] = 0] = "init";
    MessageType[MessageType["format"] = 1] = "format";
    MessageType[MessageType["complete"] = 2] = "complete";
    MessageType[MessageType["resolveCompletion"] = 3] = "resolveCompletion";
    MessageType[MessageType["change"] = 4] = "change";
    MessageType[MessageType["hover"] = 5] = "hover";
    MessageType[MessageType["validate"] = 6] = "validate";
    MessageType[MessageType["applyDelta"] = 7] = "applyDelta";
    MessageType[MessageType["changeMode"] = 8] = "changeMode";
    MessageType[MessageType["changeOptions"] = 9] = "changeOptions";
    MessageType[MessageType["dispose"] = 10] = "dispose";
    MessageType[MessageType["globalOptions"] = 11] = "globalOptions";
    MessageType[MessageType["configureFeatures"] = 12] = "configureFeatures";
    MessageType[MessageType["signatureHelp"] = 13] = "signatureHelp";
    MessageType[MessageType["documentHighlight"] = 14] = "documentHighlight";
})(MessageType || (exports.MessageType = MessageType = {}));
//# sourceMappingURL=message-types.js.map