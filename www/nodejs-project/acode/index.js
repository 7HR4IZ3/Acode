// Ensure changed basedir from "/" to Acode files directory
process.chdir(__dirname);

const fs = require("node:fs");
const path = require("node:path");
const { app, channel } = require("cordova-bridge");
const { parse, stringify } = require("lossless-json");
const {
  getClass,
  ChainProxy,
  ChainConnection,
  BaseBridgeClient,
  BridgeTransporter
} = require("js-bridge");
const util = require("node:util");
const npm = require("../npm");

channel.post("server:started", {});

// Wrap console functions
(function(...names) {
  for (let name of names) {
    const originalCallback = console[name];
    if (originalCallback) {
      console[name] = function (...data) {
        channel.post("process:stdout", util.format(...data) + "\n");
        originalCallback.bind(console)(...data);
      };
    }
  }
})("log", "info", "debug", "warn");

npm.load().then(() => channel.post("npm:loaded", {}));


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

// Acode Events
channel.on("acode:exec", ({ code, context }) => {
  (function () {
    eval(code);
  }).bind(context || {})();
});

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
      pluginID,
      error: null
    });
  } catch (err) {
    channel.post("acode:loadPlugin:status", {
      pluginID,
      error: err.toString()
    });
  }
}

// Acode to NodeJS bridge
const transporter = new BridgeTransporter(channel);
const client = new BaseBridgeClient({
  transporter,
  context: { npm, require, global },
  proxy: ChainProxy,
  connection: ChainConnection
});

const window = client.start();
const { encoder, decoder } = window[getClass];
channel.setStringify(payload => stringify(payload, encoder));
channel.setParse(data => parse(data, decoder));

channel.post("server:ready", {});
