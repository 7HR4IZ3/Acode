import "styles/lsclient.scss";

import pty from "lib/pty";
import Page from "components/page";
import EditorFile from "lib/editorFile";
import EditorManager from "lib/editorManager";
import sideButton from "components/sideButton";
import settingsPage from "components/settingsPage";

import { rightSidebarApps } from "../../../sidebarApps";
import { addCustomSettings } from "settings/mainSettings";

import {
  ReconnectingWebSocket,
  formatUrl,
  unFormatUrl,
  getFolderName,
  getCodeLens
} from "./utils";

import * as converters from "./ace-linters/type-converters/lsp-converters";
import {
  fromPoint,
  fromRange,
  toRange
} from "./ace-linters/type-converters/lsp-converters";
import { BaseService } from "./ace-linters/services/base-service";
import { LanguageClient } from "./ace-linters/services/language-client";

import appSettings from "lib/settings";

/**
 * @typedef {object} EditorManager
 * @property {import("ace-code").Ace.Editor} editor
 */

/** @type {EditorManager} */
const { editor } = editorManager;

let defaultServices = {};
var Range = ace.require("ace/range").Range;
let commandId = "acodeLsExecuteCodeLens";

let symbolKindToClass = {
  1: "file",
  2: "module",
  3: "module",
  4: "module",
  5: "class",
  6: "method",
  7: "property",
  8: "field",
  9: "method",
  10: "enum",
  11: "interface",
  12: "function",
  13: "variable",
  14: "variable",
  20: "attribute",
  24: "event",
  25: "typeparameter"
};

class CustomService extends BaseService {
  constructor(...args) {
    super(...args);
    this.$handlers = {};
  }

  async doComplete(document, position) {
    let handlers = this.$handlers["completion"];
    let allCompletions = [];
    if (handlers) {
      for (let handler of handlers) {
        let completions = await handler.bind(this)(document, position);
        if (completions) {
          completions.map(item => allCompletions.push(item));
        }
      }
    }
    return allCompletions;
  }

  async doValidation(document) {
    let handlers = this.$handlers["validation"];
    let allValidations = [];
    if (handlers) {
      for (let handler of handlers) {
        let completions = await handler.bind(this)(document);
        if (completions) {
          completions.map(item => allValidations.push(item));
        }
      }
    }
    return allValidations;
  }

  async doHover(document) {
    let handlers = this.$handlers["hover"];
    if (handlers) {
      let allHovers = [];
      for (let handler of handlers) {
        let completions = await handler.bind(this)(document);
        if (completions) {
          completions.map(item => allHovers.push(item));
        }
      }
    }
    return allHovers;
  }

  async doCodeLens() {
    let handlers = this.$handlers["codeLens"];
    let allCodeLens = [];
    if (handlers) {
      for (let handler of handlers) {
        let completions = await handler.bind(this)();
        if (completions) {
          completions.map(item => {
            item.command && (iten.command.id = commandId);
            allCodeLens.push(item);
          });
        }
      }
    }
    return allCodeLens;
  }

  addHandler(target, handler) {
    (this.$handlers[target] ??= []).push(handler);
    return handler;
  }
}

/**
 * @param {string} mode
 * @returns {CustomService}
 */
function get(mode) {
  return (s[mode] ??= new CustomService(mode));
}

let defaultService = new CustomService("any");

export class AcodeLanguageServerPlugin {
  $rootUri;
  $folders;
  $progressNodes;
  $breadcrumbsTree;
  $breadcrumbsNodes;

  async initialize() {
    this.$page = new Page("References");
    this.$tree = new Page("File Structure");

    this.$treeBtn = sideButton({
      bottom: true,
      text: "Structure",
      icon: "edit",
      onclick: () => {
        this.$tree.innerHTML = "";
        this.$tree.appendChild(this.$breadcrumbsNode.cloneNode(true));
        this.$tree.show();
      }
    });

    this.$logs = [];
    this.$sockets = {};
    this.$currentSymbols = null;
    this.$serverInfos = new Map();
    this.$progressNodes = new Map();

    // let commandPath = await pty.host.getCommandPath("acode-ls", "acode-ls");
    // if (!commandPath) {
    //   let installLoader = acode
    //     .require("loader")
    //     .create(
    //       "Installing acode language server",
    //       `Running 'npm install -g acode-lsp'`
    //     );
    //   installLoader.show();

    //   try {
    //     await pty.run("npm", ["install", "-g", "acode-lsp"], {
    //       background: false, sessionAction: 0
    //     });
    //     installLoader.setMessage("Server sucessfully installed");
    //   } catch (error) {
    //     alert("PtyError", "Server install failed. Try manually in termux.");
    //     console.error(error?.toString?.() || error);
    //   } finally {
    //     setTimeout(() => installLoader.destroy(), 2000);
    //   }
    // }

    // await pty.host.run({ command: "acode-ls", type: "process" });

    await this.setup();
  }

  async setup() {
    const { ServiceManager } = await import(
      "./ace-linters/services/service-manager"
    );
    const { LanguageProvider } = await import(
      "./ace-linters/language-provider"
    );

    this.$options = {
      functionality: {
        hover: this.settings.hover,
        format: this.settings.format,
        completion: {
          overwriteCompleters: false
        },
        completionResolve: this.settings.completionResolve
      }
    };

    let serviceTarget = new EventTarget();
    let providerTarget = new EventTarget();

    this.$manager = new ServiceManager({
      addEventListener: (...args) => providerTarget.addEventListener(...args),
      postMessage(message) {
        serviceTarget.dispatchEvent(
          new MessageEvent("message", { data: message })
        );
      },
      dispatchEvent: (event, data) =>
        providerTarget.dispatchEvent(
          new CustomEvent(event, {
            detail: data
          })
        )
    });

    this.$manager.registerService("html", {
      features: { signatureHelp: false },
      rootUri: () => this.#getRootUri(),
      className: "HtmlService",
      modes: "html",
      workspaceFolders: () => this.#getFolders(),
      module: () => import("./ace-linters/services/html/html-service")
    });

    this.$manager.registerService("css", {
      features: { signatureHelp: false },
      module: () => import("./ace-linters/services/css/css-service"),
      className: "CssService",
      modes: "css",
      rootUri: () => this.#getRootUri(),
      works6paceFolders: () => this.#getFolders()
    });

    this.$manager.registerService("less", {
      features: { signatureHelp: false },
      rootUri: () => this.#getRootUri(),
      className: "CssService",
      modes: "less",
      workspaceFolders: () => this.#getFolders(),
      module: () => import("./ace-linters/services/css/css-service")
    });

    this.$manager.registerService("scss", {
      features: { signatureHelp: false },
      rootUri: () => this.#getRootUri(),
      className: "CssService",
      modes: "scss",
      workspaceFolders: () => this.#getFolders(),
      module: () => import("./ace-linters/services/css/css-service")
    });

    this.$manager.registerService("json", {
      rootUri: () => this.#getRootUri(),
      className: "JsonService",
      modes: "json",
      workspaceFolders: () => this.#getFolders(),
      features: { signatureHelp: false, documentHighlight: false },
      module: () => import("./ace-linters/services/json/json-service")
    });

    this.$manager.registerService("json5", {
      features: { signatureHelp: false, documentHighlight: false },
      module: () => import("./ace-linters/services/json/json-service"),
      rootUri: () => this.#getRootUri(),
      className: "JsonService",
      modes: "json5",
      workspaceFolders: () => this.#getFolders()
    });

    // this.$manager.registerService("yaml", {
    //   features: { signatureHelp: false, documentHighlight: false },
    //   module: () => import("./ace-linters/services/yaml/yaml-service"),
    //   rootUri: () => this.#getRootUri(),
    //   className: "YamlService",
    //   modes: "yaml",
    //   workspaceFolders: () => this.#getFolders()
    // });

    // this.$manager.registerService("lua", {
    //   features: { signatureHelp: false, documentHighlight: false },
    //   module: () => import("./ace-linters/services/lua/lua-service"),
    //   rootUri: () => this.#getRootUri(),
    //   className: "LuaService",
    //   modes: "lua",
    //   workspaceFolders: () => this.#getFolders()
    // });

    // this.$manager.registerService("php", {
    //   features: { signatureHelp: false, documentHighlight: false },
    //   module: () => import("./ace-linters/services/php/php-service"),
    //   rootUri: () => this.#getRootUri(),
    //   className: "PhpService",
    //   modes: "php",
    //   workspaceFolders: () => this.#getFolders()
    // });

    this.$client = LanguageProvider.create({
      addEventListener: (...args) => serviceTarget.addEventListener(...args),
      postMessage(message) {
        providerTarget.dispatchEvent(
          new MessageEvent("message", { data: message })
        );
      }
    });

    if (window.acode && this.settings.format) {
      acode.registerFormatter(
        "Acode",
        ["html", "css", "scss", "less", "lua", "xml", "yaml", "json", "json5"],
        () => this.$client.format()
      );
    }

    this.$client.setGlobalOptions("", {
      ...(this.settings.options?.global || {})
    });

    this.#setupSidebar();
    this.#setupCommands();
    if (this.settings.codelens) {
      this.#setupCodelens(editorManager.editor);
      EditorManager.on("create", ({editor}) => {
        this.#setupCodelens(editor);
      });
    }
    this.#setupAcodeEvents();
    this.#setupFooter();
    if (this.settings.breadcrumbs) {
      this.#setupBreadcrumbs();
    }

    EditorManager.on("create", ({editor}) => {
      this.#registerEditor(editor);
    });
    this.#registerEditor(editor);

    if (this.settings.replaceCompleters) {
      EditorManager.on("create", ({editor}) => {
        editor.completers.splice(1, 2);
      });
      this.$completers = editorManager.editor.completers.splice(1, 2);
    }

    const { list, cb } = this.settingsObj;
    addCustomSettings(
      {
        key: "languageclient-settings",
        text: strings["languageclient"] || "Language Client",
        index: 2,
        icon: "code"
      },
      settingsPage("Language Client", list, cb)
    );

    let wrap = (mode, callback) => {
      return async (...args) => {
        let activeMode = editorManager.editor.session.$modeId.substring(9);
        if (mode.split("|").includes(activeMode)) {
          return await callback(...args);
        }
        return [];
      };
    };

    this.$exports = {
      BaseService,
      LanguageClient,
      LanguageProvider,
      ReconnectingWebSocket,

      utils: {
        converters
      },

      setupLangaugeClient: (name, { command, args, config, modes, format }) => {
        let client = new LanguageClient({
          type: "stdio",
          args: args || [],
          command
        });

        this.$exports.registerService(modes, client, config || {});

        format &&
          acode.registerFormatter(name + " Language Client", format, () =>
            this.$client.format()
          );
      },

      format: () => this.$client.format(),
      dispatchEvent: (name, data) =>
        providerTarget.dispatchEvent(new CustomEvent(name, { detail: data })),

      registerService: (mode, client, options) => {
        if (Array.isArray(mode)) {
          mode = mode.join("|");
        }

        if (client instanceof BaseService || client instanceof LanguageClient) {
          options = options || {};
          client.ctx = this.$manager.ctx;

          client.serviceData.modes = mode;
          client.serviceData.options = options;
          client.serviceData.rootUri = () => this.#getRootUri();
          client.serviceData.workspaceFolders = () => this.#getFolders();

          // console.log("Registering service for: " + mode);

          this.$manager.registerService(options.alias || mode.split("|")[0], {
            options: options,
            serviceInstance: client,
            rootUri: () => this.#getRootUri(),
            workspaceFolders: () => this.#getFolders(),
            modes: mode,
            features: (client.serviceData.features =
              this.setDefaultFeaturesState(client.serviceData.features || {}))
          });

          if (client instanceof LanguageClient) {
            client.enqueueIfNotConnected(() => {
              client.connection.onNotification(
                "$/typescriptVersion",
                params => {
                  this.$buildBreadcrumbs();
                  let serverInfo = {
                    name: "typescript",
                    version: params.version
                  };
                  this.$serverInfos.set(mode, serverInfo);
                  this.#setServerInfo(serverInfo);
                }
              );
            });
          }

          this.$client.setGlobalOptions(mode, options);
        } else {
          throw new Error("Invalid client.");
        }
      },
      registerEditor: editor => {
        this.$client.registerEditor(editor);
      },

      getSocket: url => {
        if (url.startsWith("server") || url.startsWith("auto")) {
          return new ReconnectingWebSocket(
            this.settings.url + url,
            null,
            false,
            true,
            this.settings.reconnectDelay,
            this.settings.closeTimeout
          );
        }
        throw new Error(
          "Invalid url. Use ReconnectingWebSocket directly instead."
        );
      },

      getSocketForCommand: (command, args = []) => {
        let url =
          "auto/" +
          encodeURIComponent(command) +
          "?args=" +
          JSON.stringify(args);
        return new ReconnectingWebSocket(
          this.settings.url + url,
          null,
          false,
          true,
          this.settings.reconnectDelay,
          this.settings.closeTimeout
        );
      },

      provideHover(mode, callback) {
        return defaultService.addHandler("hover", wrap(mode, callback));
      },
      provideCodeLens(mode, callback) {
        return defaultService.addHandler("codeLens", wrap(mode, callback));
      },
      provideCompletion(mode, callback) {
        return defaultService.addHandler("completion", wrap(mode, callback));
      },
      provideCodeAction(mode, callback) {
        return defaultService.addHandler("codeAction", wrap(mode, callback));
      },
      provideValidation(mode, callback) {
        return defaultService.addHandler("validation", wrap(mode, callback));
      }
    };

    // For compatibitlity with plugins
    acode.define("acode-language-client", this.$exports);
    acode.define("language-client", this.$exports);

    providerTarget.addEventListener("initialized", ({ detail }) => {
      // console.log("Initialized:", detail);
      this.$buildBreadcrumbs();
      let mode =
        detail.lsp.serviceData.options?.alias ||
        detail.lsp.serviceData.modes.split("|")[0];

      if (!detail.params.serverInfo) return;

      this.$serverInfos.set(mode, detail.params.serverInfo);
      this.#setServerInfo(detail.params.serverInfo);
    });

    editorManager.on("switch-file", async () => {
      let mode =
        editorManager.editor.session.$modeId.substring(9);
      let serverInfo = this.$serverInfos.get(mode);
      if (!serverInfo) {
        for (let [key, value] of this.$serverInfos) {
          if (key.split("|").includes(mode)) {
            serverInfo = value;
            break;
          }
        }
      }

      if (serverInfo) {
        this.#setServerInfo(serverInfo);
      } else {
        let node = this.$footer.querySelector(".server-info");
        node.style.display = "none";
      }
    });

    let titles = new Map();
    providerTarget.addEventListener("progress", ({ detail }) => {
      let progress = this.#getProgress(detail.token);
      if (progress) {
        if (detail.value.kind === "begin") {
          titles.set(detail.token, detail.title);
        } else if (detail.value.kind === "report") {
          progress.show();
        } else if (detail.value.kind === "end") {
          titles.delete(detail.token);
          return progress.remove();
        }

        progress.setTitle(titles.get(detail.token));

        if (detail.value.message) {
          let percentage = detail.value.percentage;
          progress.setMessage(
            detail.value.message +
              (percentage ? " <br/>(" + String(percentage) + "%)" : "")
          );
        }
      }
    });

    // providerTarget.addEventListener("create/progress", ({ detail }) => {});
    // providerTarget.addEventListener("initialized", ({ detail }) => {})

    // Default Language Clients
    this.$exports.setupLangaugeClient("Typescript", {
      command: "typescript-language-server",
      modes: "typescript|javascript|tsx|jsx",
      args: ["--stdio"],
      format: ["js", "jsx", "ts", "tsx"],
      config: {
        parserOptions: { sourceType: "module" },
        errorCodesToIgnore: [
          "2304",
          "2732",
          "2554",
          "2339",
          "2580",
          "2307",
          "2540"
        ]
      }
    });
    this.$exports.setupLangaugeClient("C/C++", {
      command: "clangd",
      modes: "c_cpp",
      args: [],
      format: ["cpp", "c", "cc", "cxx", "h", "hh", "hpp", "ino"],
      config: {}
    });

    this.$exports.setupLangaugeClient("Dart", {
      command: "dart",
      modes: "dart",
      args: ["--language-server"],
      format: ["dart"],
      config: {}
    });

    this.$exports.setupLangaugeClient("Svelte", {
      command: "svelteserver",
      modes: "svelte",
      args: ["--stdio"],
      format: ["svelte"],
      config: {}
    });

    this.$exports.setupLangaugeClient("Vetur", {
      command: "vls",
      modes: "vue",
      args: [],
      format: ["vue"],
      config: {}
    });

    this.$exports.setupLangaugeClient("Rust", {
      command: "rust-analyzer",
      modes: "rust",
      args: [],
      format: ["rust"],
      config: {}
    });

    this.$exports.setupLangaugeClient("Python", {
      command: "pylsp",
      modes: "python",
      args: ["--check-parent-process"],
      format: ["py"],
      config: {
        configuration: { ignore: ["E501", "E401", "F401", "F704"] },
        pylsp: {
          configurationSources: ["pycodestyle"],
          plugins: {
            pycodestyle: {
              enabled: true,
              ignore: ["E501"],
              maxLineLength: 10
            },
            pyflakes: {
              enabled: false
            },
            pylint: {
              enabled: false
            },
            pyls_mypy: {
              enabled: false
            }
          }
        }
      }
    });

    this.$exports.setupLangaugeClient("PHP", {
      command: "phpactor",
      modes: "php",
      args: [],
      format: ["php"],
      config: {}
    });

    this.$exports.setupLangaugeClient("Lua", {
      command: "lua-language-server",
      modes: "lua",
      args: [],
      format: ["lua"],
      config: {}
    });

    this.$exports.setupLangaugeClient("Go", {
      command: "gopls",
      modes: "go",
      args: ["serve"],
      format: ["go"],
      config: {}
    });

    this.$exports.setupLangaugeClient("Java", {
      command: "/data/data/com.termux/files/home/jdtls/bin/jdtls",
      modes: "java",
      args: [],
      format: ["java"],
      config: {}
    });

    rightSidebarApps.add("code", "ls-structure", "Code Structure", node => {
      this.$sidebarNode = node;
      this.$sidebarNode.classList.add("breadcrumb-dropdown");
      this.$sidebarNode.classList.add("ace_autocomplete");
    });
  }

  #getProgress(token) {
    let node = this.$footer.querySelector("div#token-" /*+ token*/);
    if (!node) {
      node = this.$footer.appendChild(
        tag("div", {
          id: "token-" /* + token*/,
          children: [
            tag("span", {
              className: "title",
              textContent: ""
            })
          ]
        })
      );
    }

    return {
      show: () => {
        node.style.display = "block";
      },
      remove: () => {
        node.style.display = "none";
      },
      setTitle: title => {
        if (!title) return;
        node.querySelector("span.title").innerHTML = title;
      },
      setMessage: message => {
        if (!message) return;
        node.querySelector("span.title").innerHTML = message;
      }
    };
  }

  #languageServersSettings() {
    const title = strings["language servers"] || "Langauge Servers";
    const values = appSettings.value;
    const { modes } = ace.require("ace/ext/modelist");

    if (!this.settings.servers) {
      values["languageclient"].servers = this.settings.servers = {};
      appSettings.update();
    }

    const items = modes.map(mode => {
      const { name, caption } = mode;
      const server = appSettings.value["languageclient"].servers[name] || {
        command: "",
        args: "",
        formatter: true
      };

      return {
        key: name,
        text: caption,
        icon: `file file_type_default file_type_${name}`,
        value: `${server.command} ${server.args}`
      };
    });

    const callback = key => {
      this.#languageServerSettings(modes.find(mode => mode.name === key));
    };

    const page = settingsPage(title, items, callback, "separate");
    page.show();
  }

  #languageServerSettings({ name, caption }) {
    const title = `${
      caption[0].toUpperCase() + caption.slice(1)
    } Language Server`;
    const server = appSettings.value["languageclient"].servers[name] || {
      command: "",
      args: "",
      formatter: true
    };
    const items = [
      {
        index: 0,
        key: "serverPath",
        text: "Server command",
        value: `${server.command} ${server.args}`,
        prompt: "Server Command"
      },
      {
        index: 1,
        key: "formatter",
        text: "Register formatter",
        checkbox: !!server.formatter
      }
    ];

    const callback = (key, value) => {
      switch (key) {
        case "serverPath":
          const [command, ...extra] = value.trim().split(" ");
          value = { ...server, command, args: extra.join(" ") };
          break;
        case "formatter":
          value = { ...server, formatter: !!value };
          break;
        default:
          return;
      }
      appSettings.value["languageclient"].servers[name] = value;
      appSettings.update();
    };

    const page = settingsPage(title, items, callback, "separate");
    page.show();
  }

  #setServerInfo({ name, version }) {
    let node = this.$footer.querySelector(".server-info");
    node.innerHTML = `${name} (${version})`;
    node.style.display = "block";
  }

  setDefaultFeaturesState(serviceFeatures) {
    let features = serviceFeatures ?? {};
    features.hover ??= true;
    features.completion ??= true;
    features.completionResolve ??= true;
    features.format ??= true;
    features.diagnostics ??= true;
    features.signatureHelp ??= true;
    features.documentHighlight ??= true;
    return features;
  }

  log(message, type = "debug") {
    if (!this.$logger) {
      this.$logger = acode.require("acode.sdk")?.getLogger("languageclient");
      if (this.$logger) {
        this.$logs.map(i => this.$logger.info(i));
      }
    }
    if (this.$logger) {
      this.$logger.log(type, message);
    } else {
      this.$logs.push(message);
    }
  }

  destroy() {}

  async #openFile(uri, range) {
    uri = decodeURIComponent(uri);

    let url = acode.require("url");
    let helpers = acode.require("helpers");
    let file = acode.require("editorfile");
    let filename = url.basename(uri);

    uri = unFormatUrl(uri);

    let activeFile = editorManager.getFile(uri, "uri");

    if (!activeFile) {
      activeFile = new file(filename, { uri });
      let promise = new Promise(cb => activeFile.on("loadend", cb));
      await promise;
    }

    activeFile.makeActive();
    if (range) {
      let cursor = toRange(range);
      activeFile.session.selection.moveCursorTo(
        cursor.start.row,
        cursor.start.column
      );
      editorManager.editor.focus();
    }
    return activeFile;
  }

  #applyEdits(fileEdits, session) {
    for (let edit of fileEdits.reverse()) {
      session.replace(toRange(edit.range), edit.newText);
    }
  }

  #getRootUri() {
    if (editorManager.activeFile?.uri) {
      let openfolder = acode.require("openfolder");
      let folder = openfolder.find(editorManager.activeFile.uri);
      if (folder?.url) {
        return "file://" + formatUrl(folder.url, false);
      }
    }

    // if (this.$rootUri) return this.$rootUri;

    let folders = this.#getFolders();

    if (folders?.length) {
      return folders[0].url;
    } else {
      // For testing in browser on pc
      return null;
    }
    return null;
  }

  get workspaceFolders() {
    return this.#getFolders();
  }

  #getFolders() {
    const folders = JSON.parse(localStorage.folders || "[]");
    if (!window.acode && !folders.length) {
      return null;
    }

    this.$folders = folders.map(item => ({
      name: item.opts.name,
      uri: "file://" + formatUrl(item.url, false),
      url: "file://" + formatUrl(item.url, false)
    }));
    return this.$folders;
  }

  #getServices(session) {
    return this.$manager.findServicesByMode(
      (session || editorManager.editor.session).$modeId.substring(9)
    );
  }

  #filterService(validate, services) {
    services = services || this.#getServices();
    return services.filter(service => {
      let instance = service.serviceInstance;
      if (!instance) return false;

      let capabilities = instance.serviceCapabilities;
      if (validate(capabilities)) {
        return true;
      }
      return false;
    });
  }
  
  #registerEditor(editor) {
    this.$client.registerEditor(editor);
    editor.on("focus", () => {
      if (this.$mainNode?.classList.contains("visible")) {
        this.$mainNode?.classList.remove("visible");
      }
      if (this.$currentRange !== undefined) {
        editor.session.removeMarker(this.$currentRange);
      }
    });
  }

  #setupBreadcrumbs() {
    this.$breadcrumbsNode = tag("ul", {
      className: "breadcrumbs ace_autocomplete"
    });
    let mainElement = document.querySelector("#root ul.open-file-list");
    if (!mainElement) {
      mainElement = document.body;
    }
    mainElement.after(this.$breadcrumbsNode);

    document.addEventListener("click", ({ target }) => {
      if (target.matches(".container.breadcrumb-dropdown *")) {
        this.$mainNode?.classList.remove("visible");
        return;
      }

      if (!target.matches(".breadcrumbs, .breadcrumbs *, .dropdown *")) {
        if (this.$mainNode?.classList.contains("visible")) {
          this.$mainNode?.classList.remove("visible");
        }
      } else {
        this.$mainNode?.classList.add("visible");
      }
    });
  }

  #setupAcodeEvents() {
    if (!window.acode) return;

    editorManager.on("remove-file", file => {
      if (!file.session) return;
      let services = this.#getServices(file.session);
      try {
        services.map(service => {
          service.serviceInstance?.removeDocument({
            uri: this.$client.$getFileName(file.session)
          });
        });
      } catch (e) {
        console.error(e);
      }
    });

    editorManager.on("rename-file", file => {
      let services = this.#getServices(file.session);
      try {
        services.map(service => {
          service.serviceInstance?.removeDocument({
            uri: this.$client.$getFileName(file.session)
          });
        });
      } catch (e) {
        console.error(e);
      }

      this.$client.$registerSession(file.session, editorManager.editor);
    });

    editorManager.on("remove-folder", folder => {
      let allServices = Object.values(this.$manager.$services);
      let services = this.#filterService(capabilities => {
        return capabilities.workspace?.workspaceFolders?.changeNotifications;
      }, allServices);
      try {
        services.map(service => {
          service.serviceInstance.connection.sendRequest(
            "workspace/didChangeWorkspaceFolders",
            {
              event: {
                added: [],
                removed: [
                  {
                    name: folder.opts?.name,
                    uri: "file://" + formatUrl(folder.url, false),
                    url: "file://" + formatUrl(folder.url, false)
                  }
                ]
              }
            }
          );
        });
      } catch (e) {
        console.error(e);
      }
    });

    editorManager.on("add-folder", folder => {
      let allServices = Object.values(this.$manager.$services);
      let services = this.#filterService(capabilities => {
        return capabilities.workspace?.workspaceFolders?.changeNotifications;
      }, allServices);
      try {
        services.map(service => {
          service.serviceInstance.connection.sendRequest(
            "workspace/didChangeWorkspaceFolders",
            {
              event: {
                removed: [],
                added: [
                  {
                    name: folder.opts?.name,
                    uri: "file://" + formatUrl(folder.url, false),
                    url: "file://" + formatUrl(folder.url, false)
                  }
                ]
              }
            }
          );
        });
      } catch (e) {
        console.error(e);
      }
    });

    if (this.settings.breadcrumbs) {
      let timeout;
      this.$func = async () => {
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(async () => {
          await this.$buildBreadcrumbs();
          timeout = null;
        }, 500);
      };

      editorManager.editor.on("change", this.$func);
      EditorManager.on("create", ({editor}) => {
        editor.on("change", this.$func);
      });
      editorManager.on("switch-file", () =>
        setTimeout(this.$buildBreadcrumbs.bind(this), 0)
      );
      this.$func();
    }
  }

  #setupCodelens(editor) {
    return new Promise((resolve, reject) => {
      getCodeLens(codeLens => {
        if (!codeLens) return reject("CodeLens not available.");

        editor.commands.addCommand({
          name: commandId,
          exec: (editor, args) => {
            console.log("Executing:", args);
            let item = args[0];
            if (item.exec) {
              item.exec();
            }
          }
        });

        editor.commands.addCommand({
          name: "acodeLsClearCodeLenses",
          exec: (editor, args) => {
            codeLens.clear(editor.session);
          }
        });
        editor.setOption("enableCodeLens", true);

        codeLens.registerCodeLensProvider(editor, {
          provideCodeLenses: async (session, callback) => {
            let services = this.#filterService(
              capabilities => capabilities.codeLensProvider
            ).map(service => service.serviceInstance);
            let uri = this.$client.$getFileName(editor.session);
            let result = [...(await defaultService.doCodeLens())];

            let promises = services.map(async service => {
              if (service.connection) {
                let response = await service.connection.sendRequest(
                  "textDocument/codeLens",
                  { textDocument: { uri } }
                );
                // console.log("CodeLens:", response);
                if (!response) return;
                for (let item of response) {
                  if (!item.command && !item.data) continue;

                  result.push({
                    ...toRange(item.range),
                    command: {
                      id: commandId,
                      title:
                        item.command?.tooltip ||
                        item.command?.title ||
                        (item.data || [])[2] ||
                        "Unknown Action",
                      arguments: [item]
                    }
                  });
                }
              } else {
                let response = await service.doCodeLens?.({ uri });
                if (response) {
                  response.map(i => result.push(i));
                }
              }
            });
            await Promise.all(promises);

            callback(null, result);
          }
        });
        resolve(codeLens);
      });
    });
  }

  #setupFooter() {
    this.$footer = (
      tag("div", {
        className: "button-container",
        style: {
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "center"
        },
        children: [
          tag("span", {
            className: "server-info"
          })
        ]
      })
    );

    if (!!this.settings.showFooter) {
      let footer = document.querySelector("#root footer");
      footer.appendChild(this.$footer)
    }
  }

  #setupSidebar() {
    this.$node = tag("div", { className: "refBody" });
    this.$page?.body.appendChild(this.$node);
  }

  #showReferences(references) {
    let helpers = acode.require("helpers");
    this.$page?.settitle("References");
    this.$node.innerHTML = "";

    for (let ref of references) {
      let node = this.$node.appendChild(
        tag("div", {
          className: "refChild",
          children: [
            tag("span", {
              className: "icon " + helpers.getIconForFile(ref.uri)
            }),
            tag("h5", {
              className: "refTitle",
              textContent:
                ref.uri + `(${ref.range.start.line}:${ref.range.end.line})`,
              onclick: () => this.#openFile(ref.uri, ref.range)
            })
          ]
        })
      );
    }

    this.$page?.show();
  }

  #setupCommands() {
    let commands = [
      {
        name: "Go To Declaration",
        exec: () => this.#goToDeclaration()
      },
      {
        name: "Go To Definition",
        exec: () => this.#goToDefinition()
      },
      {
        name: "Go To Type Definition",
        exec: () => this.#goToDefinition(true)
      },
      {
        name: "Go To Implementations",
        exec: () => this.#findImplementations()
      },
      {
        name: "Show References",
        exec: () => this.#findReferences()
      },
      {
        name: "Show Code Actions",
        exec: () => this.#codeActions()
      },
      {
        name: "Rename Symbol",
        exec: () => this.#renameSymbol()
      },
      {
        name: "Format Code",
        exec: () => this.$client.format()
      }
    ];

    let selection = window.acode?.require("selectionMenu");
    selection?.add(
      async () => {
        let action = await acode.select(
          "Select Action",
          commands.map((command, index) => [index, command.name])
        );
        if (action) {
          return commands[action]?.exec();
        }
      },
      tag("span", {
        className: "icon edit"
      }),
      "all",
      false
    );

    editorManager.editor.commands.addCommands(commands);
    EditorManager.on("create", ({editor}) => {
      editor.commands.addCommands(commands);
    });
  }

  #goToDefinition(type = false) {
    let services = this.#filterService(capabilities => {
      if (type) return capabilities.typeDefinitionProvider;
      return capabilities.definitionProvider;
    }).map(service => service.serviceInstance);
    let cursor = editorManager.editor.getCursorPosition();
    let position = fromPoint(cursor);

    services.map(service => {
      if (service.connection) {
        service.connection
          .sendRequest(
            "textDocument/" + (type ? "typeDefinition" : "definition"),
            {
              textDocument: {
                uri: this.$client.$getFileName(editorManager.editor.session)
              },
              position
            }
          )
          .then(response => {
            console.log("Definition:", response);
            if (response) {
              if (!Array.isArray(response)) {
                response = [response];
              }

              response.map(item => {
                this.#openFile(item.uri, item.range);
              });
            }
          });
      }
    });
  }

  #goToDeclaration() {
    let services = this.#filterService(
      capabilities => capabilities.declarationProvider
    ).map(service => service.serviceInstance);
    let cursor = editorManager.editor.getCursorPosition();
    let position = fromPoint(cursor);

    services.map(async service => {
      if (service.connection) {
        service.connection
          .sendRequest("textDocument/declaration", {
            textDocument: {
              uri: this.$client.$getFileName(editorManager.editor.session)
            },
            position
          })
          .then(response => {
            console.log("Declaration:", response);
            if (!Array.isArray(response)) {
              response = [response];
            }

            response.map(item => {
              this.#openFile(item.uri, item.range);
            });
          });
      } else {
        let response = await service.findCodeLens?.({ uri });
        if (response) {
          response.map(item => {
            this.#openFile(item.uri, item.range);
          });
        }
      }
    });
  }

  #findReferences() {
    let services = this.#filterService(
      capabilities => capabilities.referencesProvider
    ).map(service => service.serviceInstance);
    let cursor = editorManager.editor.getCursorPosition();
    let position = fromPoint(cursor);

    services.map(async service => {
      if (service.connection) {
        service.connection
          .sendRequest("textDocument/references", {
            textDocument: {
              uri: this.$client.$getFileName(editorManager.editor.session)
            },
            position,
            context: { includeDeclaration: true }
          })
          .then(response => {
            console.log("References:", response);
            if (!Array.isArray(response)) {
              response = [response];
            }
            this.#showReferences(response);

            // response.map((item) => {
            // this.#openFile(item.uri, item.range);
            // });
          });
      } else {
        let response = await service.findReferences?.({ uri }, position);
        if (response) {
          this.#showReferences(response);
        }
      }
    });
  }

  #findImplementations() {
    let services = this.#filterService(
      capabilities => capabilities.implementationProvider
    ).map(service => service.serviceInstance);
    let cursor = editorManager.editor.getCursorPosition();
    let position = fromPoint(cursor);

    services.map(async service => {
      if (service.connection) {
        service.connection
          .sendRequest("textDocument/implementation", {
            textDocument: {
              uri: this.$client.$getFileName(editorManager.editor.session)
            },
            position
          })
          .then(response => {
            console.log("Implementation:", response);
            if (!Array.isArray(response)) {
              response = [response];
            }

            response.map(item => {
              this.#openFile(item.uri, item.range);
            });
          });
      } else if (service.findImplememtations) {
        let response = await service.findImplememtations({ uri }, position);
        if (response) {
          response.map(i => result.push(i));
        }
      }
    });
  }

  #codeActions() {
    let services = this.#filterService(
      capabilities => capabilities.codeActionProvider
    ).map(service => service.serviceInstance);
    let cursor = editorManager.editor.getCursorPosition();
    let position = fromPoint(cursor);
    let range = fromRange(editorManager.editor.selection.getRange());

    services.map(service => {
      if (service.connection) {
        service.connection
          .sendRequest("textDocument/codeAction", {
            textDocument: {
              uri: this.$client.$getFileName(editorManager.editor.session)
            },
            range,
            context: {
              diagnostics: []
            },
            triggerKind: 2
          })
          .then(async actions => {
            console.log("Actions:", actions);
            if (!window.acode) return;

            if (actions?.length) {
              let action = await acode.select(
                "Code Action",
                actions.map((action, index) => [index, action.title])
              );
              if (action) {
                service.connection
                  .sendRequest("codeAction/resolve", actions[action])
                  .then(resolved => {
                    console.log("Resolved:", resolved);
                  });
              }
            }
          });
      }
    });
  }

  async #renameSymbol() {
    let services = this.#filterService(
      capabilities => capabilities.renameProvider
    ).map(service => service.serviceInstance);

    let cursor = editorManager.editor.getCursorPosition();
    let position = fromPoint(cursor);

    let currentName = editorManager.editor.getSelectedText();
    let newName = await (window.acode?.prompt || prompt)(
      "New name",
      currentName
    );

    services.map(service => {
      if (service.connection) {
        service.connection
          .sendRequest("textDocument/rename", {
            textDocument: {
              uri: this.$client.$getFileName(editorManager.editor.session)
            },
            newName,
            position
          })
          .then(async response => {
            console.log("Rename:", response);
            let changes = response.changes || response.documentChanges;
            if (Array.isArray(changes)) {
              for (let change of changes) {
                let efile = await this.#openFile(change.textDocument.uri);
                this.#applyEdits(changes.edits, efile.session);
              }
            } else {
              for (let file in changes) {
                // console.log(file, changes[file])
                let efile = await this.#openFile(file);
                this.#applyEdits(changes[file], efile.session);
              }
            }
          });
      }
    });
  }

  async getDocumentSymbols() {
    let services = this.#filterService(
      capabilities => capabilities.documentSymbolProvider
    );

    if (!services.length) return [];

    try {
      if (services[0].serviceInstance instanceof LanguageClient) {
        return await services[0].serviceInstance.connection.sendRequest(
          "textDocument/documentSymbol",
          {
            textDocument: {
              uri: this.$client.$getFileName(editorManager.editor.session)
            }
          }
        );
      } else {
        return services[0].serviceInstance.findDocumentSymbols({
          uri: this.$client.$getFileName(editorManager.editor.session)
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  async $buildBreadcrumbs() {
    let symbols =
      editorManager.activeFile instanceof EditorFile
        ? await this.getDocumentSymbols()
        : [];

    if (!symbols?.length) {
      this.$treeBtn?.hide();
      this.$breadcrumbsNode.style.display = "none";
    } else if (symbols !== this.$currentSymbols) {
      this.$currentSymbols = symbols;

      function createTreeObject(objects) {
        // Helper function to find the immediate parent object by name
        function findImmediateParent(name) {
          return objects.find(object => object.name === name);
        }

        // Build the tree recursively
        function buildNode(object) {
          const node = {
            ...object,
            children: []
          };

          const children = objects.filter(
            child => findImmediateParent(child.containerName) === object
          );
          children.forEach(child => node.children.push(buildNode(child)));

          return node;
        }

        // Find the root nodes (objects with no parent)
        let url = acode.require("url");
        let filename = url.basename(editorManager.activeFile.uri);

        const rootNodes = objects.filter(object => {
          if (!object.containerName) {
            return true;
          } else {
            // Java jdtls root node has the containerName set to the filename.
            return object.containerName === filename;
          }
        });

        // Build the tree object and return it
        return rootNodes.map(node => buildNode(node));
      }

      let tree =
        typeof symbols[0]?.children !== "undefined"
          ? symbols
          : createTreeObject(symbols);
      this.$breadcrumbsTree = tree;
      this.$breadcrumbsNode.style.display = "flex";
      this.$buildBreadcrumbsUi(tree);
      this.$treeBtn.show();
      return true;
    }
    return false;
  }

  $buildBreadcrumbsUi(tree) {
    let breadcrumbNodes = [];
    let currentIndex = breadcrumbNodes.length ? breadcrumbNodes.length - 1 : 0;

    let buildBreadcrumbNodes = () => {
      this.$breadcrumbsNode.innerHTML = "";
      for (let object of breadcrumbNodes) {
        let node = tag("span", {
          className: "breadcrumb-name",
          children: [
            tag("i", {
              className:
                "ace_completion-icon ace_" +
                (symbolKindToClass[object.kind] || "value")
            }),
            tag("span", {
              textContent: object.name
            }),
            tag("span", { className: "breadcrumb-sep" })
          ]
        });
        node = this.$breadcrumbsNode.appendChild(
          tag("li", {
            className: "breadcrumb-item",
            children: [node]
          })
        );
      }
    };

    let createNode = (object, level = 0) => {
      let dropdown,
        node = tag("span", {
          className: "dropdown-name",
          children: [
            tag("span", { className: "dropdown-toggle" }),
            tag("i", {
              className:
                "ace_completion-icon ace_" +
                (symbolKindToClass[object.kind] || "value")
            }),
            tag("span", {
              textContent: object.name
            })
          ]
        });

      if (object.children?.length) {
        dropdown = tag("ul", {
          className: "dropdown",
          children: object.children.map(child => {
            let [childNode, childDropdown] = createNode(child, level + 1);
            let item = tag("li", {
              className: "dropdown-item",
              children: [
                tag("div", {
                  children: childDropdown
                    ? [childNode, childDropdown]
                    : [childNode]
                })
              ]
            });
            if (!childDropdown) {
              item.classList.add("childless");
            }
            return item;
          })
        });
        node.appendChild(dropdown);
      }

      return [node, dropdown];
    };

    this.$mainNode?.remove();

    if (tree.length >= 1) {
      if (tree.length === 1) {
        breadcrumbNodes[currentIndex] = tree[0];
      } else {
        breadcrumbNodes[currentIndex] = {
          ...tree[0],
          children: tree
        };
      }
      const [dropdown, structure] = createNode(
        breadcrumbNodes[currentIndex],
        currentIndex
      );
      this.$mainNode = tag("div", {
        children: [structure]
      });

      if (this.$sidebarNode) {
        this.$sidebarNode.innerHTML = "";
        this.$sidebarNode.appendChild(
          tag("div", {
            children: [structure.cloneNode(true)]
          })
        );
      }
    }
    this.$mainNode?.classList.add("breadcrumb-dropdown");
    this.$mainNode?.classList.add("ace_autocomplete");
    buildBreadcrumbNodes();

    return this.$mainNode ? document.body.appendChild(this.$mainNode) : null;
  }

  #expandNode({ target }) {
    if (target === node || target.parentElement === node) {
      if (object.children.length && dropdown) {
        dropdown.classList.toggle("visible");
      }
      breadcrumbNodes[level - 1] = object;
      breadcrumbNodes.splice(level);
      buildBreadcrumbNodes();

      if (!object.location) return;

      let start = object.location.range.start;
      let end = object.location.range.end;

      editorManager.editor.scrollToLine(start.line - 10);
      editorManager.editor.session.selection.moveCursorTo(
        start.line,
        start.character
      );

      if (this.$currentRange !== undefined) {
        editorManager.editor.session.removeMarker(this.$currentRange);
      }

      this.$currentRange = editorManager.editor.session.addMarker(
        new Range(start.line, 0, end.line, 0),
        "ace_selected-word",
        "fullLine"
      );
    }
  }

  getDefaultValue(settingValue, defaultValue = true) {
    if (typeof settingValue === "undefined") {
      return defaultValue;
    }
    return settingValue;
  }

  get settings() {
    if (!window.acode) {
      return this.defaultSettings;
    }

    let value = appSettings.value["languageclient"];
    if (!value) {
      value = appSettings.value["languageclient"] = this.defaultSettings;
      appSettings.update();
    }
    return value;
  }

  get defaultSettings() {
    return {
      servers: {},
      hover: true,
      format: true,
      completion: true,
      completionResolve: true,
      replaceCompleters: true,
      codelens: true,
      breadcrumbs: true,
      showFooter: false,
      reconnectDelay: 1,
      closeTimeout: 60 * 3,
      breadcrumbTimeout: 1000,
      url: "ws://localhost:3030/"
    };
  }

  get settingsObj() {
    const AppSettings = acode.require("settings");
    return {
      list: [
        {
          index: 0,
          key: "languageServers",
          text: "Language Servers",
          info: "Language server config for each mode"
        },
        {
          key: "closeTimeout",
          text: "Disconnect server timeout",
          info: "Disconnect language server after how many seconds?",
          value: this.getDefaultValue(this.settings.closeTimeout, 60 * 3),
          prompt: "Disconnect Server Timeout",
          promptType: "number"
        },
        {
          key: "reconnectDelay",
          text: "Server reconnect delay",
          info: "Try to reconnect to the language server after how many seconds?",
          value: this.getDefaultValue(this.settings.reconnectDelay, 1),
          prompt: "Server Reconnect Delay",
          promptType: "number"
        },
        {
          key: "breadcrumbTimeout",
          text: "Update breadcrumb timeout",
          info: "Update breadcrumb navigation after how many seconds?",
          value: this.getDefaultValue(this.settings.breadcrumbTimeout, 1000),
          prompt: "Update Breadcrumb Timeout",
          promptType: "number"
        },
        {
          key: "url",
          text: "Server Url",
          value: this.getDefaultValue(this.settings.url),
          prompt: "Server URL",
          promptType: "text"
        },
        {
          key: "showFooter",
          text: "Show Footer",
          checkbox: this.getDefaultValue(this.settings.showFooter),
          info: "Show footer for language server info"
        },
        {
          key: "hover",
          text: "Show Tooltip",
          checkbox: this.getDefaultValue(this.settings.hover),
          info: "Show Tooltip on hover or selection"
        },
        {
          key: "breadcrumbs",
          text: "Breadcrumb Navigation",
          checkbox: this.getDefaultValue(this.settings.breadcrumbs),
          info: "Enable breadcrumb navigation.."
        },
        {
          key: "codelens",
          text: "Code Lens",
          checkbox: this.getDefaultValue(this.settings.codelens),
          info: "Enable codelens."
        },
        {
          key: "completion",
          text: "Code Completion",
          checkbox: this.getDefaultValue(this.settings.completion),
          info: "Enable code completion."
        },
        {
          key: "completionResolve",
          text: "Doc Tooltip",
          checkbox: this.getDefaultValue(this.settings.completionResolve),
          info: "Enable code completion resolve."
        },
        {
          key: "replaceCompleters",
          text: "Replace Completers",
          checkbox: this.getDefaultValue(this.settings.replaceCompleters),
          info: "Disable the default code completers."
        }
      ],
      cb: (key, value) => {
        switch (key) {
          case "languageServers":
            this.#languageServersSettings();
            return;
          case "url":
            if (!value.endsWith("/")) {
              value = value + "/";
            }
            break;
          case "replaceCompleters":
            if (value) {
              this.$completers = editorManager.editor.completers.splice(1, 2);
            } else {
              if (this.$completers) {
                editorManager.editor.completers = [
                  ...this.$completers,
                  ...editorManager.editor.completers
                ];
              }
            }
            break;
          case "showFooter":
            if (value) {
              let footer = document.querySelector("#root footer");
              footer.appendChild(this.$footer)
            } else {
              this.$footer.remove();
            }
            break;
          default:
            acode.alert(
              "Acode Language Server",
              "Settings updated. Restart acode app."
            );
        }
        AppSettings.value["languageclient"][key] = value;
        AppSettings.update();
      }
    };
  }
}

export let lsp = (window.lsp = new AcodeLanguageServerPlugin());
export default lsp;
