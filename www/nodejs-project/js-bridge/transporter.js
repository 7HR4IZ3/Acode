const { EventEmitter } = require("node:events");
const { WebSocket, WebSocketServer } = require("ws");
const { parse, stringify } = require("lossless-json");
const { isRawObject, generateRandomID } = require("./utils.js");

class BaseTransporterClient extends EventEmitter {
  recieve(message) {
    return new Promise((resolve, reject) => {
      if (!message) return reject("Message cannot be nullish");

      let messageID = generateRandomID();
      this.once(messageID, data => {
        resolve(data);
      });

      this.send({ messageID, message });
    });
  }
}

class BaseTransporter extends EventEmitter {
  #config;
  #chunks = [];
  #expectedLength;

  constructor(config) {
    super();
    this.#config = config || {};
  }

  startServer() {
    throw new Error("Not implemented");
  }
  startClient() {
    throw new Error("Not implemented");
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

  decode(data, decodeRaw = false) {
    if (decodeRaw) return parse(data);
    return parse(data, this.getConfig("decoder"));
  }

  encode(data, encodeRaw = false) {
    if (encodeRaw) return stringify(data);
    return stringify(data, this.getConfig("encoder"));
  }

  prepare(data, raw, seperator = "\r\n\r\n") {
    data = this.encode(data, raw).trim();
    return "Content-Length: " + String(data.length) + seperator + data;
  }

  #checkJSON(data) {
    try {
      parse(data);
      return true;
    } catch {
      return false;
    }
  }

  #handleMessage(client, dataString, dataLength) {
    let DEBUG = this.getConfig("debug");

    if (!dataString) {
      this.#expectedLength = dataLength;
      return;
    }

    // If currentMessage matches the local data length, send and return
    if (
      dataLength &&
      (dataString.length === dataLength || dataString.length === dataLength - 4)
    ) {
      DEBUG &&
        console.log("DSending:", dataString, this.#checkJSON(dataString));
      return client.emit("message", this.decode(dataString));
    }

    // If currentMessage matches the expected data length, send and return
    if (
      this.#expectedLength &&
      (dataString.length === this.#expectedLength ||
        dataString.length === this.#expectedLength - 4)
    ) {
      DEBUG &&
        console.log("ESending:", dataString, this.#checkJSON(dataString));
      return client.emit("message", this.decode(dataString));
    }

    // If no local data length use global expected length
    if (!dataLength && this.#expectedLength) {
      dataLength = this.#expectedLength;
    }

    // Else check if has previous message
    if (this.#chunks.length >= 1) {
      // If previous message, check if current message plus previous messsges
      // length matches the expected length
      const completeMessage = this.#chunks.join("") + dataString;
      if (
        completeMessage.length === dataLength ||
        completeMessage.length === dataLength - 4
      ) {
        // Reset this.#chunks array and expected length
        this.#chunks = [];

        DEBUG &&
          console.log(
            "Sending:",
            completeMessage,
            this.#checkJSON(completeMessage)
          );
        return client.emit("message", this.decode(completeMessage));
      }
    } else {
      // Add the data to the this.#chunks array
      // and set global length to local length
      this.#chunks.push(dataString);
      this.#expectedLength = dataLength;
    }
  }

  handleMessage(client, data) {
    let DEBUG = this.getConfig("debug");
    let dataString = data.toString();

    console.log("Handling:", dataString);

    // Check if the data contains 'Content-Length'
    if (dataString.includes("Content-Length")) {
      let messages = dataString.split("Content-Length:");

      for (let message of messages) {
        if (!message?.length) continue;
        DEBUG &&
          console.log("\n\nHandling message:", message, this.#expectedLength);

        // Extract the content length
        const contentLengthMatch = ("Content-Length:" + message).match(
          /Content-Length: (\d+)/
        );
        if (contentLengthMatch) {
          message = message.split("\r\n\r\n")[1];
          this.#handleMessage(
            client, message,
            parseInt(contentLengthMatch[1], 10)
          );
        } else {
          this.#handleMessage(client, message);
        }
      }
    } else {
      this.#handleMessage(client, dataString);
    }
  }
}

class WebSocketClient extends EventEmitter {
  #prepare;
  #socket;

  constructor(socket, prepare) {
    super();
    this.#socket = socket;
    this.#prepare = prepare;
  }

  send(message) {
    let cleaned = this.#prepare(message);
    // console.log("Sending:", cleaned);
    this.#socket.send(cleaned);
  }

  recieve(message) {
    return new Promise((resolve, reject) => {
      if (!message) return reject("Message cannot be nullish");

      let messageID = generateRandomID();

      // console.log("Send from:", message, messageID);
      this.once(messageID, data => {
        // console.log("Recieved from:", data, messageID);
        resolve(data);
      });

      this.send({ messageID, message });
    });
  }
}

class WebSocketTransporter extends BaseTransporter {
  startClient() {
    let host = this.getConfig("host") || "localhost";
    let port = this.getConfig("port") || 7001;

    let socket = new WebSocket(`ws://${host}:${port}`);
    let client = new WebSocketClient(socket, this.prepare.bind(this));

    socket.on("open", () => client.emit("ready"));
    socket.on("close", () => client.emit("close"));
    socket.on("error", () => client.emit("error"));
    socket.on("message", data =>
      this.handleMessage(client, data.toString())
    );

    return client;
  }

  startServer() {
    let host = this.getConfig("host") || "localhost";
    let port = this.getConfig("port") || 7001;

    let server = new WebSocketServer({ host, port });
    console.log(`* Server started on port ${port}`);

    server.on("connection", socket => {
      let client = new WebSocketClient(
        socket, this.prepare.bind(this)
      );

      socket.on("error", () => client.emit("error"));
      socket.on("close", () => client.emit("close"));

      socket.on("message", data => 
        this.handleMessage(client, data.toString())
      );

      this.emit("connection", client);
    });
  }
}

class BridgeClient extends BaseTransporterClient {
  #channel;

  constructor(channel) {
    super();
    this.#channel = channel;
  }

  send(message) {
    console.log("Sending:", message)
    this.#channel.post("bridge:message", message);
  }
}

class BridgeTransporter extends BaseTransporter {
  #channel;

  constructor(channel) {
    super();
    this.#channel = channel;
  }

  #start() {
    let client = new BridgeClient(this.#channel);

    this.#channel.on("bridge:open", () => client.emit("ready"));
    this.#channel.on("bridge:close", () => client.emit("close"));
    this.#channel.on("bridge:error", () => client.emit("error"));
    this.#channel.on("bridge:message", data => {
      console.log("Recieved:", data);
      client.emit("message", data)
    });

    return client;
  }


  startClient() {
    return this.#start();
  }

  startServer() {
    this.emit("connection", this.#start());
  }
}

module.exports = {
  BaseTransporter,
  BridgeTransporter,
  WebSocketTransporter
};
