export class BaseMessage {
    sessionId;
    constructor(sessionId) {
        this.sessionId = sessionId;
    }
}
export class InitMessage extends BaseMessage {
    type = MessageType.init;
    mode;
    options;
    value;
    version;
    constructor(sessionId, value, version, mode, options) {
        super(sessionId);
        this.version = version;
        this.options = options;
        this.mode = mode;
        this.value = value;
    }
}
export class FormatMessage extends BaseMessage {
    type = MessageType.format;
    value;
    format;
    constructor(sessionId, value, format) {
        super(sessionId);
        this.value = value;
        this.format = format;
    }
}
export class CompleteMessage extends BaseMessage {
    type = MessageType.complete;
    value;
    constructor(sessionId, value) {
        super(sessionId);
        this.value = value;
    }
}
export class ResolveCompletionMessage extends BaseMessage {
    type = MessageType.resolveCompletion;
    value;
    constructor(sessionId, value) {
        super(sessionId);
        this.value = value;
    }
}
export class HoverMessage extends BaseMessage {
    type = MessageType.hover;
    value;
    constructor(sessionId, value) {
        super(sessionId);
        this.value = value;
    }
}
export class ValidateMessage extends BaseMessage {
    type = MessageType.validate;
    constructor(sessionId) {
        super(sessionId);
    }
}
export class ChangeMessage extends BaseMessage {
    type = MessageType.change;
    value;
    version;
    constructor(sessionId, value, version) {
        super(sessionId);
        this.value = value;
        this.version = version;
    }
}
export class DeltasMessage extends BaseMessage {
    type = MessageType.applyDelta;
    value;
    version;
    constructor(sessionId, value, version) {
        super(sessionId);
        this.value = value;
        this.version = version;
    }
}
export class ChangeModeMessage extends BaseMessage {
    type = MessageType.changeMode;
    mode;
    value;
    constructor(sessionId, value, mode) {
        super(sessionId);
        this.value = value;
        this.mode = mode;
    }
}
export class ChangeOptionsMessage extends BaseMessage {
    type = MessageType.changeOptions;
    options;
    merge;
    constructor(sessionId, options, merge = false) {
        super(sessionId);
        this.options = options;
        this.merge = merge;
    }
}
export class DisposeMessage extends BaseMessage {
    type = MessageType.dispose;
    constructor(sessionId) {
        super(sessionId);
    }
}
export class GlobalOptionsMessage {
    type = MessageType.globalOptions;
    serviceName;
    options;
    merge;
    constructor(serviceName, options, merge) {
        this.serviceName = serviceName;
        this.options = options;
        this.merge = merge;
    }
}
export class ConfigureFeaturesMessage {
    type = MessageType.configureFeatures;
    serviceName;
    options;
    constructor(serviceName, options) {
        this.serviceName = serviceName;
        this.options = options;
    }
}
export class SignatureHelpMessage extends BaseMessage {
    type = MessageType.signatureHelp;
    value;
    constructor(sessionId, value) {
        super(sessionId);
        this.value = value;
    }
}
export class DocumentHighlightMessage extends BaseMessage {
    type = MessageType.documentHighlight;
    value;
    constructor(sessionId, value) {
        super(sessionId);
        this.value = value;
    }
}
export var MessageType;
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
})(MessageType || (MessageType = {}));
