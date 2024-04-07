const { EventEmitter } = require("node:events");
const { isRawObject } = require("./utils.js");

class BaseHandler extends EventEmitter {
  #config;
  #proxies;

  constructor(config) {
    super();

    this.#proxies = new Map();
    this.#config = config || {};
  }

  getConfig(name) {
    return this.#config[name];
  }

  configure(config) {
    if (!isRawObject(config)) throw new Error("Config must be an object");

    this.emit("configure:before", config);
    this.#config = { ...this.#config, ...config };
    this.emit("configure");
  }

  async handleMessage(client, { messageID, message }) {
    // console.log("Handling:", messageID, message);
    if (message.error) throw new Error(message.error);

    if (message.action) {
      const { action, ...extra } = message;
      const respond = (response, error = null) =>
        client.send(
          error !== null
            ? { messageID, message: { error: String(error) } }
            : { messageID, message: { response } }
        );

      client.emit("action", action, extra, respond);
      this.emit("action", client, action, extra, respond);
      client.emit(`action:${action}`, client, extra, respond);
    } else if (message.event) {
      const { event, ...extra } = message;
      client.emit(event, extra);
      this.emit("event", client, event, extra);
    } else if (messageID) {
      client.emit(messageID, message.response);
      this.emit("response", client, messageID, message.response);
    }
  }
}

module.exports = { BaseHandler };
