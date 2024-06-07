import Url from "utils/Url";
import fonts from "lib/fonts";
import box from "dialogs/box";
import Color from "utils/color";
import themes from "theme/list";
import files from "lib/fileList";
import alert from "dialogs/alert";
import Page from "components/page";
import commands from "lib/commands";
import helpers from "utils/helpers";
import projects from "lib/projects";
import prompt from "dialogs/prompt";
import select from "dialogs/select";
import loader from "dialogs/loader";
import fsOperation from "fileSystem";
import toast from "components/toast";
import sidebarApps from "sidebarApps";
import confirm from "dialogs/confirm";
import browser from "plugins/browser";
import appSettings from "lib/settings";
import colorPicker from "dialogs/color";
import EditorView from "lib/editorView";
import EditorFile from "lib/editorFile";
import openFolder from "lib/openFolder";
import encodings from "utils/encodings";
import ThemeBuilder from "theme/builder";
import palette from "components/palette";
import actionStack from "lib/actionStack";
import fsWrapper from "fileSystem/wrapper";
import tutorial from "components/tutorial";
import FileBrowser from "pages/fileBrowser";
import multiPrompt from "dialogs/multiPrompt";
import EditorManager from "lib/editorManager";
import selectionMenu from "lib/selectionMenu";
import SideButton from "components/sideButton";
import inputhints from "components/inputhints";
import KeyboardEvent from "utils/keyboardEvent";
import keyboardHandler from "handlers/keyboard";
import windowResize from "handlers/windowResize";
import Contextmenu from "components/contextmenu";
import initializeExtensions from "lib/extensions";
import settingsPage from "components/settingsPage";
import formatterSettings from "settings/formatterSettings";

import ptyModule, { setup } from "lib/pty";

import { addedFolder } from "lib/openFolder";
import { parse, stringify } from "lossless-json";
import { decode, encode } from "utils/encodings";
import { addMode, removeMode } from "ace/modelist";
import { addIntentHandler, removeIntentHandler } from "handlers/intent";
import {
  getClass,
  ChainProxy,
  ChainConnection,
  BaseBridgeServer,
  BridgeTransporter
} from "browser-bridge";

export const constants = Symbol("constants");
export const getPlugin = Symbol("getPlugin");

export default class Acode {
  #npm = null;
  #nodejs = null;
  #connections = null;
  #nodejsInitialized = false;
  
  select = select;

  #modules = {};
  #plugins = {};
  
  #constants = {};

  #formatter = [
    {
      id: "default",
      name: "Default",
      exts: ["*"],
      format: async () => {
        const { beautify } = ace.require("ace/ext/beautify");
        const cursorPos = editorManager.editor.getCursorPosition();
        beautify(editorManager.editor.session);
        editorManager.editor.gotoLine(cursorPos.row + 1, cursorPos.column);
      }
    }
  ];

  constructor() {
    this.#connections = [];
    const encodingsModule = {
      get encodings() {
        return encodings;
      },
      encode,
      decode
    };

    const themesModule = {
      add: themes.add,
      get: themes.get,
      list: themes.list,
      update: themes.update,
      // Deprecated, not supported anymore
      apply: () => {}
    };

    const sidebarAppsModule = {
      add: sidebarApps.add,
      get: sidebarApps.get,
      remove: sidebarApps.remove
    };

    const aceModes = {
      addMode,
      removeMode
    };

    const intent = {
      addHandler: addIntentHandler,
      removeHandler: removeIntentHandler
    };

    window.define("acode", (_, __, mod) => {
      mod.exports = module;
    });

    this.#nodejs = window.nodejs;
    delete window.nodejs;

    this.#npm = this.#nodejs.createChannel("acode-npm");

    const bridgeChannel = this.#nodejs.createChannel("acode-bridge");
    const transporter = new BridgeTransporter(bridgeChannel);
    const server = new BaseBridgeServer({ transporter });

    server.configure({
      context: window, proxy: ChainProxy,
      connection: ChainConnection
    });
    server.on("connection", (client, connection) => {
      this.#connections.push({ client, connection });

      let { encoder, decoder } = connection[getClass];
      bridgeChannel.setParse(data => parse(data, decoder));
      bridgeChannel.setStringify(payload => stringify(payload, encoder));
    });
    server.start();
    
    for (let name of ["log", "info", "debug", "warn"]) {
      this.#nodejs.channel.on(
        "process:" + name,
        data => console[name](data, data.length)
      );
    }

    this.#nodejs.channel.on("process:stderr", data => {
      console.error(data);
    });

    this.#nodejs.channel.on("process:uncaughtException", data => {
      console.error(data);
    });

    this.#nodejs.channel.on("process:warning", data => {
      console.warn(data);
    });

    this.#nodejs.start("acode/index.js", err => {
      if (err) return toast("Error loading nodejs: " + String(err));

      this.#nodejsInitialized = true;
    }, { redirectOutputToLogcat: true });

    this.define("Url", Url);
    this.define("page", Page);
    this.define("Color", Color);
    this.define("fonts", fonts);
    this.define("toast", toast);
    this.define("alert", alert);
    this.define("select", select);
    this.define("pty", ptyModule);
    this.define("loader", loader);
    this.define("dialogBox", box);
    this.define("prompt", prompt);
    this.define("intent", intent);
    this.define("fileList", files);
    this.define("fs", fsWrapper); // Changed to fsWrapper
    this.define("browser", browser);
    this.define("confirm", confirm);
    this.define("helpers", helpers);
    this.define("palette", palette);
    this.define("projects", projects);
    this.define("tutorial", tutorial);
    this.define("aceModes", aceModes);
    this.define("themes", themesModule);
    this.define("settings", appSettings);
    this.define("sideButton", SideButton);
    this.define("EditorFile", EditorFile);
    this.define("EditorView", EditorView);
    this.define("inputhints", inputhints);
    this.define("openfolder", openFolder);
    this.define("colorPicker", colorPicker);
    this.define("actionStack", actionStack);
    this.define("multiPrompt", multiPrompt);
    this.define("addedfolder", addedFolder);
    this.define("contextMenu", Contextmenu);
    this.define("fileBrowser", FileBrowser);
    this.define("fsOperation", fsOperation); // fsOperation still available
    this.define("keyboard", keyboardHandler);
    this.define("windowResize", windowResize);
    this.define("encodings", encodingsModule);
    this.define("themeBuilder", ThemeBuilder);
    this.define("EditorManager", EditorManager);
    this.define("selectionMenu", selectionMenu);
    this.define("sidebarApps", sidebarAppsModule);
    this.define("createKeyboardEvent", KeyboardEvent);
    this.define("toInternalUrl", helpers.toInternalUri);
  }

  async initialize() {
    this.setLoadingMessage("Loading nodejs backend...");
    await new Promise((resolve, reject) => {
      if (!this.#nodejsInitialized)
        return resolve(false);

      let timeout;
      this.#nodejs.channel.once("acode:pong", () => {
        clearTimeout(timeout); resolve(true);
      });

      this.#nodejs.channel.post("acode:ping");

      timeout = setTimeout(() => {
        this.#nodejsInitialized = false;
        this.setLoadingMessage("Nodejs took too long...");
        console.error("NodeJS took too long to start!!");
        resolve(false);
      }, 1000 * 5);
    });

    setup();
    await initializeExtensions();
  }

  [getPlugin](pluginID) {
    return this.#plugins[pluginID];
  }

  get nodejs() {
    // if (!this.#nodejsInitialized)
    //   throw new Error("NodeJS not initialized");
    return this.#nodejs;
  }

  get npm() {
    const self = this;
    return {
      async config(config = {}) {
        const result = await self.#npm.recieve("config", config);
        if (result.err) throw result.err;
        return true;
      },
      async install(packages, { global=false, dev=false, directory } = {}) {
        directory && self.exec(`process.chdir("${directory}")`);
        const result = await self.#npm.recieve("install", {
          packages, dev, global
        });
        if (result.err) throw new Error(result.err);
        return true
      }
    }
  }

  get connections() { return this.#connections }

  get constants() {
    return this.#constants;
  }

  set [constants](value) {
    this.#constants = value;
  }

  execute(code) {
    this.#nodejs.channel.post("acode:exec", code);
  }

  /**
   * Define a module
   * @param {string} name
   * @param {Object|function} module
   */
  define(name, module) {
    if (this.#modules[name.toLowerCase()]) {
      throw new Error("Module already exists");
    }

    this.#modules[name.toLowerCase()] = module;
    window.define(
      `@acode/${name.toLowerCase()}`,
      (_, __, mod) => (mod.exports = module)
    );
  }

  require(module) {
    return this.#modules[module.toLowerCase()];
  }

  exec(key, val) {
    if (key in commands) {
      return commands[key](val);
    } else {
      return false;
    }
  }

  get exitAppMessage() {
    const numFiles = editorManager.hasUnsavedFiles();
    if (numFiles) {
      return strings["unsaved files close app"];
    }
  }

  setLoadingMessage(message) {
    document.body.setAttribute("data-small-msg", message);
  }

  /**
   * Sets plugin init function
   * @param {string} id
   * @param {() => void} initFunction
   * @param {{list: import('components/settingsPage').ListItem[], cb: (key: string, value: string)=>void}} settings
   */
  setPluginInit(id, initFunction, settings) {
    if (this.#plugins[id]) {
      const message =
        `Plugin with id: "${id}" already registered`;
      throw new Error(message);
    }

    this.#plugins[id] = {
      init: initFunction,
      settings, legacy: true
    };

    if (!settings) return;

    const settingPage = settingsPage(
      id, settings.list, settings.cb
    );
    appSettings.uiSettings[`plugin-${id}`] =
      this.#plugins[id]["settingPage"] = settingPage;
  }

  setPluginUnmount(id, unmountFunction) {
    if (!this.#plugins[id]) {
      const message =
        `Plugin with id: "${id}" dosen't exist`;
      throw new Error(message);
    }

    this.#plugins[id]["unmount"] = unmountFunction;
  }

  /**
   *
   * @param {string} id plugin id
   * @param {string} baseUrl local plugin url
   * @param {HTMLElement} $page
   */
  async initPlugin(id, baseUrl, $page, options) {
    if (id in this.#plugins) {
      await this.#plugins[id]["init"](baseUrl, $page, options);
    }
  }

  unmountPlugin(id) {
    if (id in this.#plugins) {
      this.#plugins[id]["unmount"]?.();
      fsOperation(
        Url.join(window.CACHE_STORAGE, id)
      ).delete();
    }

    delete appSettings.uiSettings[`plugin-${id}`];
  }

  registerFormatter(id, extensions, format) {
    this.#formatter.unshift({
      id,
      exts: extensions,
      format
    });
  }

  unregisterFormatter(id) {
    this.#formatter = this.#formatter.filter(formatter => formatter.id !== id);
    const { formatter } = appSettings.value;
    Object.keys(formatter).forEach(mode => {
      if (formatter[mode] === id) {
        delete formatter[mode];
      }
    });
    appSettings.update(false);
  }

  async format(selectIfNull = true) {
    const file = editorManager.activeFile;
    const { getModeForPath } = ace.require("ace/ext/modelist");
    const { name } = getModeForPath(file.filename);
    const formatterId = appSettings.value.formatter[name];
    const formatter = this.#formatter.find(({ id }) => id === formatterId);

    await formatter?.format();

    if (!formatter && selectIfNull) {
      formatterSettings(name);
      this.#afterSelectFormatter(name);
      return;
    } else if (!formatter && !selectIfNull) {
      toast(strings["please select a formatter"]);
    }
  }

  #afterSelectFormatter(name) {
    appSettings.on("update:formatter", format);

    function format() {
      appSettings.off("update:formatter", format);
      const id = appSettings.value.formatter[name];
      const formatter = this.#formatter.find(({ id: _id }) => _id === id);
      formatter?.format();
    }
  }

  newEditorFile(filename, options, manager) {
    new EditorFile(filename, options, manager);
  }

  get formatters() {
    return this.#formatter.map(({ id, name, exts }) => ({
      id, name: name || id, exts
    }));
  }

  /**
   *
   * @param {string[]} extensions
   * @returns {Array<[id: String, name: String]>} options
   */
  getFormatterFor(extensions) {
    const options = [[null, strings.none]];
    this.formatters.forEach(({ id, name, exts }) => {
      const supports = exts.some(ext => extensions.includes(ext));
      if (supports || exts.includes("*")) {
        options.push([id, name]);
      }
    });
    return options;
  }

  alert(title, message, onhide) {
    alert(title, message, onhide);
  }

  loader(title, message, cancel) {
    return loader.create(title, message, cancel);
  }

  addIcon(className, src) {
    let style = document.head.get(`style[icon="${className}"]`);
    if (!style) {
      style = (
        <style
          icon={className}
        >{`.icon.${className}{background-image: url(${src})}`}</style>
      );
      document.head.appendChild(style);
    }
  }

  async prompt(message, defaultValue, type, options) {
    const response = await prompt(message, defaultValue, type, options);
    return response;
  }

  async confirm(title, message) {
    const confirmation = await confirm(title, message);
    return confirmation;
  }

  async toInternalUrl(url) {
    url = await helpers.toInternalUri(url);
    return url;
  }
  
  register(pluginID, initFunction) {
    this.#plugins[pluginID] = {
      legacy: false,
      context: null,
      init: initFunction
    }
  }
}
