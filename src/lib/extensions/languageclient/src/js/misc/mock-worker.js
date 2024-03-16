"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockWorker = void 0;
const events_1 = __importDefault(require("events"));
class MockWorker extends events_1.default {
    constructor(isProduction) {
        super();
        this.isProduction = isProduction;
    }
    onerror(ev) {
    }
    onmessage(ev) {
    }
    onmessageerror(ev) {
    }
    addEventListener(type, listener, options) {
        this.addListener(type, listener);
    }
    dispatchEvent(event) {
        return false;
    }
    postMessage(data, transfer) {
        if (this.isProduction) {
            this.$emitter.emit("message", { data: data });
        }
        else {
            setTimeout(() => {
                this.$emitter.emit("message", { data: data });
            }, 0);
        }
    }
    removeEventListener(type, listener, options) {
        this.removeListener(type, listener);
    }
    terminate() {
    }
    setEmitter(emitter) {
        this.$emitter = emitter;
    }
}
exports.MockWorker = MockWorker;
//# sourceMappingURL=mock-worker.js.map