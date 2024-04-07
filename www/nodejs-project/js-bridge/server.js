const { BaseHandler } = require("./base.js");
const { BaseProxy } = require("./proxy.js");
const { BaseEventHandler } = require("./events.js");
const { BaseConnection, getClass } = require("./connection.js");
const { BaseTransporter } = require("./transporter.js");

class BaseBridgeServer extends BaseHandler {
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

    transporter.configure({ server: this });
    transporter.startServer();

    transporter.on("connection", client => {
      let connection = new (this.getConfig("connection"))({
        server: this, client, transporter,
        proxy: this.getConfig("proxy")
      });
      let eventsHandler = new (this.getConfig("events"))(
        () => this.getConfig("context"),
        (key) => connection[getClass].getProxy(key)
      );

      client.on(
        "action", (...args) =>
          eventsHandler.processAction(...args)
      );
      client.on("message", message => this.handleMessage(client, message));
      this.emit("connection", client, connection);
    });
  }
}

module.exports = { BaseBridgeServer };
