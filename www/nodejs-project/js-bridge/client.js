const { BaseProxy } = require("./proxy.js");
const { BaseHandler } = require("./base.js");
const { BaseEventHandler } = require("./events.js");
const { BaseConnection, getClass } = require("./connection.js");
const { BaseTransporter } = require("./transporter.js");

class BaseBridgeClient extends BaseHandler {
  #started = false;

  constructor(config) {
    super();
    this.configure({
      context: {},
      proxy: BaseProxy,
      events: BaseEventHandler,
      connection: BaseConnection,
      ...(config || {})
    });

    this.on("configure:before", config => {
      // if (config.connection && !(config.connection instanceof BaseConnection))
      //   throw new Error("Connection must be an instance of BaseConnection");
    });
  }

  start() {
    if (this.#started) throw new Error("Server already started");

    let transporter = this.getConfig("transporter");
    if (!(transporter instanceof BaseTransporter))
      throw new Error("Invalid 'transporter' config specified");

    transporter.configure({ client: this });

    let client = transporter.startClient(),
      connection = null,
      proxy = this.getConfig("proxy"),
      eventsHandler = new (this.getConfig("events"))(
        () => this.getConfig("context"),
        key => connection[getClass].getProxy(key)
      );

    client.on("error", () => this.emit("error"));
    client.on("close", () => this.emit("close"));
    client.on("ready", () => this.emit("ready", connection));
    client.on("action", (...args) => eventsHandler.processAction(...args));
    client.on("message", message => this.handleMessage(client, message));

    connection = new (this.getConfig("connection"))({
      client, transporter, proxy
    });

    return connection;
  }
}

module.exports = { BaseBridgeClient };
