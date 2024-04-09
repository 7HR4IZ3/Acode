// Ensure changed basedir from "/" to Acode files directory
process.chdir(__dirname);

const fs = require("node:fs");
const path = require("node:path");
const { app, channel, createChannel } = require("cordova-bridge");
const { parse, stringify } = require("lossless-json");
const {
  getClass,
  ChainProxy,
  ChainConnection,
  BaseBridgeClient,
  BridgeTransporter
} = require("js-bridge");
const util = require("node:util");
const NPM = require("../npm");

const npm = new NPM({
  env: {
    HOME: __dirname,
    PREFIX: __dirname
  }
});

channel.post("server:started", {});

// Wrap console functions
for (let name of ["log", "info", "debug", "warn"]) {
  const originalCallback = console[name];
  if (originalCallback) {
    console[name] = function (...data) {
      channel.post("process:" + name, util.format(...data) + "\n");
      originalCallback.bind(console)(...data);
    };
  }
}

// Forward process events to Acode
process.on("uncaughtException", function (err) {
  err = err || "";
  channel.post(
    "process:uncaughtException",
    (err && err.stack ? err.stack : err).toString()
  );
});

process.stdout.on("data", data =>
  channel.post("process:stdout", data.toString())
);

process.stderr.on("data", data =>
  channel.post("process:stderr", data.toString())
);

process.on("warning", data => channel.post("process:warning", data));

npm.load().then(() => {
  channel.post("npm:loaded", {});
  npm.config.set("prefix", process.cwd());
});

// Acode Events
channel.on("acode:exec", (code, context) => {
  (function () { eval(code) }).bind(context || {})();
});
channel.on("acode:require", (file) => require(file));

channel.on("acode:ping", () => channel.post("acode:pong", {}));
channel.on("acode:exit", () => process.exit());

channel.on("acode:initialize", initialize);
channel.on("acode:loadPlugin", loadPlugin);
channel.on("acode:loadPlugins", loadPlugins);

channel.on("acode:npm", ({ command, argv }) => {
  const callback = npm.commands[command];
  if (!callback) channel.post("acode:npm:error", "Invalid command");

  callback(argv, err => {
    if (err) {
      channel.post("acode:npm:error", String(err));
    } else {
      channel.post("acode:npm:success", { command });
    }
  });
});

// Acode Event Listeners
async function initialize(config) {
  CONFIG = {
    ...CONFIG,
    ...config
  };
}

async function loadPlugins() {}

async function loadPlugin({ plugin, pluginID, justInstalled }) {
  try {
    channel.post("acode:loadPlugin:status", {
      pluginID, error: null
    });
  } catch (err) {
    channel.post("acode:loadPlugin:status", {
      pluginID, error: err.toString()
    });
  }
}


// NPM handlers
const npmChannel = createChannel("acode-npm");

npmChannel.on("config", (messageID, config) => {
  try {
    for (const key in config) {
      npm.config.set(key, config[key]);
    }
  } catch (err) {
    npmChannel.post(messageID, { error: err });
  }
});

npmChannel.on("install", (messageID, { global, dev, packages }) => {
  npm.config.set("dev", dev);
  npm.config.set("global", global);

  try {
    npm.commands.install(packages, err => {
      npmChannel.post(messageID, { error: err });
    });
  } catch (err) {
    npmChannel.post(messageID, { error: err });
  }
})


// Acode to NodeJS bridge
const bridgeChannel = createChannel("acode-bridge");
const transporter = new BridgeTransporter(bridgeChannel);
const client = new BaseBridgeClient({
  transporter, context: { npm, require, global },
  // proxy: ChainProxy, connection: ChainConnection
});

const window = client.start();
const { encoder, decoder } = window[getClass];
bridgeChannel.setStringify(payload => stringify(payload, encoder));
bridgeChannel.setParse(data => parse(data, decoder));

channel.post("server:ready", {});
