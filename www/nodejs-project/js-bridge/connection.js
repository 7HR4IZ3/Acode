const util = require("node:util");
const { isProxy, ChainProxy } = require("./proxy.js");
const { EventEmitter } = require("node:events");
const {
  isRawObject,
  generateRandomID,
  evaluatePromiseSync
} = require("./utils.js");

const getClass = Symbol("getClass");

class BaseConnection {
  #config;
  #proxies;

  constructor(config) {
    this.#config = config || {};
    this.#proxies = new Map();

    let transporter = this.getConfig("transporter");
    transporter.configure({
      encoder: this.#encoder.bind(this),
      decoder: this.#decoder.bind(this)
    });

    return new Proxy(() => {}, this.proxyHandlers);
  }

  #storeAsProxy(item) {
    for (let [value, key] of this.#proxies.entries()) {
      try {
        if (item === value) return key;
      } catch {}
    }

    let location = generateRandomID();
    this.#proxies.set(location, item);
    return location;
  }

  get proxyHandlers() {
    return {
      get: (target, prop) => {
        if (prop === getClass) return this;

        return evaluatePromiseSync(
          this.getConfig("client").recieve({
            action: "evaluate", value: prop
          })
        );
      }
    };
  }

  getProxy(key) {
    return this.#proxies.get(key);
  }

  getConfig(name) {
    return this.#config[name];
  }

  configure(config) {
    if (!isRawObject(config)) throw new Error("Config must be an object");
    this.#config = { ...this.#config, ...config };
  }

  #encoder(key, value) {
    return this.#encode(value);
  }

  #encode(value) {
    if (value === null || typeof value === "undefined") {
      return null;
    }

    // Check if encoding a proxy
    if (value[isProxy])
      return value.toJSON();

    if (
      isRawObject(value) ||
      Array.isArray(value) ||
      typeof value === "number" ||
      typeof value === "string" ||
      typeof value === "boolean"
    ) {
      return value;
    }

    // For everything else
    let location = this.#storeAsProxy(value);

    if (util.isFunction(value)) {
      return {
        $$__type__$$: "bridge_proxy",
        $$__obj_type__$$: "function",
        $$__location__$$: location
      };
    }

    if (Array.isArray(value)) {
      return {
        $$__type__$$: "bridge_proxy",
        $$__obj_type__$$: "array",
        $$__location__$$: location
      };
    }

    if (util.isSymbol(value)) {
      return {
        $$__type__$$: "bridge_proxy",
        $$__obj_type__$$: "symbol",
        $$__location__$$: location
      };
    }

    if (util.isBuffer(value)) {
      return {
        $$__type__$$: "bridge_proxy",
        $$__obj_type__$$: "bytes",
        $$__location__$$: location
      };
    }

    if (util.types.isSet(value)) {
      return {
        $$__type__$$: "bridge_proxy",
        $$__obj_type__$$: "set",
        $$__location__$$: location
      };
    }

    if (value instanceof Event) {
      return {
        $$__type__$$: "bridge_proxy",
        $$__obj_type__$$: "event",
        $$__location__$$: location
      };
    }

    if (util.types.isDate(value)) {
      return {
        $$__type__$$: "bridge_proxy",
        $$__obj_type__$$: "date",
        $$__location__$$: location
      };
    }

    return {
      $$__type__$$: "bridge_proxy",
      $$__obj_type__$$: typeof value,
      $$__location__$$: location
    };
  }

  #decoder(key, value) {
    if (Array.isArray(value)) {
      return value.map((cValue, cKey) => this.#decoder(cKey, cValue));
    }

    if (value && typeof value === "object") {
      if (value.$$__type__$$ === "bridge_proxy" && value.$$__location__$$)
        return this.#generateProxy(value);
    }
    return value;
  }

  #generateProxy(value) {
    return new (this.getConfig("proxy"))({
      ...value,
      server: this.getConfig("server"),
      client: this.getConfig("client")
    });
  }
}

class ChainConnection extends BaseConnection {
  get proxyHandlers() {
    let self = this;
    return {
      get (target, property) {
        if (property === getClass) return self;

        return new (self.getConfig("proxy"))({
          server: self.getConfig("server"),
          client: self.getConfig("client")
        }, [property]);
      }
    }
  }
}

module.exports = { getClass, BaseConnection, ChainConnection };
