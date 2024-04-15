import "xterm/css/xterm.css";
import "../../styles/terminal.scss";

import pty from "../pty";
import url from "../../utils/Url";
import fs from "../../fileSystem";
import appSettings from "../settings";
import openFolder from "../openFolder";
import actionStack from "../actionStack";
import Browser from "plugins/browser";
import Page from "../../components/page";
import sideButton from "../../components/sideButton";
import contextmenu from "../../components/contextmenu";
import settingsPage from "components/settingsPage";

import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebglAddon } from "xterm-addon-webgl";
import { SearchAddon } from "xterm-addon-search";
// import { Clipboard } from "@capacitor/clipboard";
import { WebLinksAddon } from "xterm-addon-web-links";
import { SerializeAddon } from "xterm-addon-serialize";

import { addCustomSettings } from "settings/mainSettings";

const cacheFile = url.join(window.CACHE_STORAGE, "acode.terminal");
let prevCmd = "bash";
let ATTRIBUTES = {
  bold: 1,
  dark: 2,
  underline: 4,
  blink: 5,
  reverse: 7,
  concealed: 8
};

let HIGHLIGHTS = {
  on_black: 40,
  on_grey: 40,
  on_red: 41,
  on_green: 42,
  on_yellow: 43,
  on_blue: 44,
  on_magenta: 45,
  on_cyan: 46,
  on_light_grey: 47,
  on_dark_grey: 100,
  on_light_red: 101,
  on_light_green: 102,
  on_light_yellow: 103,
  on_light_blue: 104,
  on_light_magenta: 105,
  on_light_cyan: 106,
  on_white: 107
};

let COLORS = {
  black: 30,
  grey: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  light_grey: 37,
  dark_grey: 90,
  light_red: 91,
  light_green: 92,
  light_yellow: 93,
  light_blue: 94,
  light_magenta: 95,
  light_cyan: 96,
  white: 97
};

let RESET = "\x1B[0m";

const CURSOR_BLINK = true;

const CURSOR_STYLE = ["block", "underline", "bar"];
const CURSOR_INACTIVE_STYLE = ["outline", "block", "bar", "underline", "none"];
const FONT_SIZE = 11;
const FONT_FAMILY = appSettings.get("editorFont");
const FONT_WEIGHT = [
  "normal",
  "bold",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900"
];
const SCROLLBACK = 1000;
const SCROLL_SENSITIVITY = 200;

const THEME_LIST = [
  "ayuDark",
  "ayuLight",
  "ayuMirage",
  "catppuccin",
  "dracula",
  "elementary",
  "everblush",
  "light",
  "material",
  "nekonakoDjancoeg",
  "oneDark",
  "sapphire",
  "siduckOneDark",
  "snazzy",
  "xterm"
  // "custom",
];

const themes = {
  snazzy: {
    background: "#282A36",
    foreground: "#EFF0EB",
    cursor: "#EFF0EB",
    black: "#0C0D13",
    red: "#FF5C57",
    green: "#5AF78E",
    yellow: "#F3F99D",
    blue: "#57C7FF",
    magenta: "#FF6AC1",
    cyan: "#9AEDFE",
    white: "#EFF0EB",
    brightBlack: "#686868",
    brightRed: "#FF5C57",
    brightGreen: "#5AF78E",
    brightYellow: "#F3F99D",
    brightBlue: "#57C7FF",
    brightMagenta: "#FF6AC1",
    brightCyan: "#9AEDFE",
    brightWhite: "#EFF0EB"
  },
  xterm: {
    foreground: "#F8F8F8",
    background: "#2D2E2C",
    selectionBackground: "#5DA5D533",
    black: "#1E1E1D",
    brightBlack: "#262625",
    red: "#CE5C5C",
    brightRed: "#FF7272",
    green: "#5BCC5B",
    brightGreen: "#72FF72",
    yellow: "#CCCC5B",
    brightYellow: "#FFFF72",
    blue: "#5D5DD3",
    brightBlue: "#7279FF",
    magenta: "#BC5ED1",
    brightMagenta: "#E572FF",
    cyan: "#5DA5D5",
    brightCyan: "#72F0FF",
    white: "#F8F8F8",
    brightWhite: "#FFFFFF"
  },
  sapphire: {
    background: "#1c2431",
    foreground: "#cccccc",
    selectionBackground: "#399ef440",
    black: "#666666",
    blue: "#399ef4",
    brightBlack: "#666666",
    brightBlue: "#399ef4",
    brightCyan: "#21c5c7",
    brightGreen: "#4eb071",
    brightMagenta: "#b168df",
    brightRed: "#da6771",
    brightWhite: "#efefef",
    brightYellow: "#fff099",
    cyan: "#21c5c7",
    green: "#4eb071",
    magenta: "#b168df",
    red: "#da6771",
    white: "#efefef",
    yellow: "#fff099"
  },
  light: {
    background: "#ffffff",
    foreground: "#333333",
    cursor: "#333333",
    cursorAccent: "#ffffff",
    selectionBackground: "#add6ff",
    black: "#000000",
    blue: "#0451a5",
    brightBlack: "#666666",
    brightBlue: "#0451a5",
    brightCyan: "#0598bc",
    brightGreen: "#14ce14",
    brightMagenta: "#bc05bc",
    brightRed: "#cd3131",
    brightWhite: "#a5a5a5",
    brightYellow: "#b5ba00",
    cyan: "#0598bc",
    green: "#00bc00",
    magenta: "#bc05bc",
    red: "#cd3131",
    white: "#555555",
    yellow: "#949800"
  },
  custom: {
    background: "#1c2431",
    foreground: "#cccccc",
    cursor: "#ffffff",
    cursorAccent: "#fff",
    selectionBackground: "#399ef440",
    black: "#666666",
    blue: "#399ef4",
    brightBlack: "#666666",
    brightBlue: "#399ef4",
    brightCyan: "#21c5c7",
    brightGreen: "#4eb071",
    brightMagenta: "#b168df",
    brightRed: "#da6771",
    brightWhite: "#efefef",
    brightYellow: "#fff099",
    cyan: "#21c5c7",
    green: "#4eb071",
    magenta: "#b168df",
    red: "#da6771",
    white: "#efefef",
    yellow: "#fff099"
  },
  ayuDark: {
    background: "#090D13",
    foreground: "#FEFEFE",
    cursor: "#E96B72",
    black: "#00050D",
    red: "#E96B72",
    green: "#90B261",
    yellow: "#F8AE4E",
    blue: "#52BCF9",
    magenta: "#F9E893",
    cyan: "#8FE0C5",
    white: "#C6C6C6",
    brightBlack: "#676767",
    brightRed: "#EF7077",
    brightGreen: "#C1D84B",
    brightYellow: "#FEB353",
    brightBlue: "#58C1FE",
    brightMagenta: "#FEED98",
    brightCyan: "#94E5CA",
    brightWhite: "#FEFEFE"
  },
  catppuccin: {
    background: "#1E1D2F",
    foreground: "#D9E0EE",
    cursor: "#D9E0EE",
    black: "#6E6C7E",
    red: "#F28FAD",
    green: "#ABE9B3",
    yellow: "#FAE3B0",
    blue: "#96CDFB",
    magenta: "#F5C2E7",
    cyan: "#89DCEB",
    white: "#C3BAC6",
    brightBlack: "#988BA2",
    brightRed: "#F28FAD",
    brightGreen: "#ABE9B3",
    brightYellow: "#FAE3B0",
    brightBlue: "#96CDFB",
    brightMagenta: "#F5C2E7",
    brightCyan: "#89DCEB",
    brightWhite: "#D9E0EE"
  },
  oneDark: {
    background: "#1E2127",
    foreground: "#5C6370",
    cursor: "#5C6370",
    black: "#000000",
    red: "#E06C75",
    green: "#98C379",
    yellow: "#D19A66",
    blue: "#61AFEF",
    magenta: "#C678DD",
    cyan: "#56B6C2",
    white: "#ABB2BF",
    brightBlack: "#5C6370",
    brightRed: "#E06C75",
    brightGreen: "#98C379",
    brightYellow: "#D19A66",
    brightBlue: "#61AFEF",
    brightMagenta: "#C678DD",
    brightCyan: "#56B6C2",
    brightWhite: "#FFFEFE"
  },
  material: {
    background: "#1E282C",
    foreground: "#C3C7D1",
    cursor: "#657B83",
    black: "#073641",
    red: "#EB606B",
    green: "#C3E88D",
    yellow: "#F7EB95",
    blue: "#80CBC3",
    magenta: "#FF2490",
    cyan: "#AEDDFF",
    white: "#FFFFFF",
    brightBlack: "#002B36",
    brightRed: "#EB606B",
    brightGreen: "#C3E88D",
    brightYellow: "#F7EB95",
    brightBlue: "#7DC6BF",
    brightMagenta: "#6C71C3",
    brightCyan: "#34434D",
    brightWhite: "#FFFFFF"
  },
  nekonakoDjancoeg: {
    background: "#2a2c3a",
    foreground: "#eeeeee",
    cursor: "#fd6b85",
    black: "#2f343f",
    red: "#fd6b85",
    green: "#63e0be",
    yellow: "#fed270",
    blue: "#67d4f2",
    magenta: "#ff8167",
    cyan: "#63e0be",
    white: "#eeeeee",
    brightBlack: "#4f4f5b",
    brightRed: "#fd6b85",
    brightGreen: "#63e0be",
    brightYellow: "#fed270",
    brightBlue: "#67d4f2",
    brightMagenta: "#ff8167",
    brightCyan: "#63e0be",
    brightWhite: "#eeeeee"
  },
  dracula: {
    background: "#282a36",
    foreground: "#94A3A5",
    cursor: "#94A3A5",
    black: "#44475a",
    red: "#ff5555",
    green: "#50fa7b",
    yellow: "#ffb86c",
    blue: "#8be9fd",
    magenta: "#bd93f9",
    cyan: "#ff79c6",
    white: "#94A3A5",
    brightBlack: "#000000",
    brightRed: "#ff5555",
    brightGreen: "#50fa7b",
    brightYellow: "#ffb86c",
    brightBlue: "#8be9fd",
    brightMagenta: "#bd93f9",
    brightCyan: "#ff79c6",
    brightWhite: "#ffffff"
  },
  ayuMirage: {
    background: "#1F2430",
    foreground: "#E5E0CE",
    cursor: "#E96B72",
    black: "#00050D",
    red: "#E96B72",
    green: "#90B261",
    yellow: "#F8AE4E",
    blue: "#52BCF9",
    magenta: "#F9E893",
    cyan: "#8FE0C5",
    white: "#C6C6C6",
    brightBlack: "#676767",
    brightRed: "#EF7077",
    brightGreen: "#C1D84B",
    brightYellow: "#FEB353",
    brightBlue: "#58C1FE",
    brightMagenta: "#FEED98",
    brightCyan: "#94E5CA",
    brightWhite: "#FEFEFE"
  },
  siduckOneDark: {
    background: "#1e222a",
    foreground: "#c8ccd4",
    cursor: "#e06c75",
    black: "#1e222a",
    red: "#e06c75",
    green: "#98c379",
    yellow: "#e5c07b",
    blue: "#61afef",
    magenta: "#c678dd",
    cyan: "#56b6c2",
    white: "#D8DEE9",
    brightBlack: "#545862",
    brightRed: "#e06c75",
    brightGreen: "#98c379",
    brightYellow: "#e5c07b",
    brightBlue: "#61afef",
    brightMagenta: "#c678dd",
    brightCyan: "#56b6c2",
    brightWhite: "#c8ccd4"
  },
  elementary: {
    background: "#101010",
    foreground: "#f2f2f2",
    cursor: "#f2f2f2",
    black: "#303030",
    red: "#e1321a",
    green: "#6ab017",
    yellow: "#ffc005",
    blue: "#004f9e",
    magenta: "#ec0048",
    cyan: "#2aa7e7",
    white: "#f2f2f2",
    brightBlack: "#5d5d5d",
    brightRed: "#ff361e",
    brightGreen: "#7bc91f",
    brightYellow: "#ffd00a",
    brightBlue: "#0071ff",
    brightMagenta: "#ff1d62",
    brightCyan: "#4bb8fd",
    brightWhite: "#a020f0"
  },
  ayuLight: {
    background: "#FEFEFE",
    foreground: "#090D13",
    cursor: "#E96B72",
    black: "#00050D",
    red: "#E96B72",
    green: "#90B261",
    yellow: "#F8AE4E",
    blue: "#52BCF9",
    magenta: "#F9E893",
    cyan: "#8FE0C5",
    white: "#c6c6c694",
    brightBlack: "#676767",
    brightRed: "#EF7077",
    brightGreen: "#C1D84B",
    brightYellow: "#FEB353",
    brightBlue: "#58C1FE",
    brightMagenta: "#FEED98",
    brightCyan: "#94E5CA",
    brightWhite: "#dacaca"
  },
  everblush: {
    name: "Everblush",
    background: "#141b1e",
    foreground: "#dadada",
    cursor: "#3b4244",
    black: "#232a2d",
    red: "#e57474",
    green: "#8ccf7e",
    yellow: "#e5c76b",
    blue: "#67b0e8",
    magenta: "#c47fd5",
    cyan: "#6cbfbf",
    white: "#b3b9b8",
    brightBlack: "#2d3437",
    brightRed: "#ef7e7e",
    brightGreen: "#96d988",
    brightYellow: "#f4d67a",
    brightBlue: "#71baf2",
    brightMagenta: "#ce89df",
    brightCyan: "#67cbe7",
    brightWhite: "#bdc3c2"
  }
};

function formatUrl(path) {
  if (!path) return false;
  if (path.startsWith("content://com.termux.documents/tree")) {
    path = path.split("::")[1];
    let termuxPath = path.replace(
      /^\/data\/data\/com\.termux\/files\/home/,
      "$HOME"
    );
    return termuxPath;
  } else if (path.startsWith("file:///storage/emulated/0/")) {
    let sdcardPath =
      "/sdcard" +
      path
        .substr("file:///storage/emulated/0".length)
        .replace(/\.[^/.]+$/, "")
        .split("/")
        .join("/") +
      "/";
    return sdcardPath;
  } else if (
    path.startsWith(
      "content://com.android.externalstorage.documents/tree/primary"
    )
  ) {
    path = path.split("::primary:")[1];
    let androidPath = "/sdcard/" + path;
    return androidPath;
  } else {
    return false;
  }
}

// const { clipboard } = window.cordova?.plugins || {};

function color(text, clr, on_color, attrs) {
  let fmt_str = (code, text) => "\x1B" + `[${code}m${text}`;

  if (clr) {
    text = fmt_str(COLORS[clr], text);
  }

  if (on_color) {
    text = fmt_str(HIGHLIGHTS[on_color], text);
  }

  if (attrs) {
    for (let attr of attrs) {
      text = fmt_str(ATTRIBUTES[attr], text);
    }
  }

  return text + RESET;
}

function getKeyCode(char) {
  var keyCode = char.toUpperCase().charCodeAt(0);
  if (keyCode >= 65 && keyCode <= 90) {
    // 90 is keyCode for 'z'
    keyCode = keyCode - 64;
  } else {
    return;
  }
  if (keyCode < 10) {
    return "0" + String(keyCode);
  }
  return String(keyCode);
}

function debounce(func, wait_ms) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait_ms);
  };
}

function addTag(type, config, setup = false) {
  let ret = document.head.appendChild(tag(type, config));
  if (setup) return awaitSetup(ret);
  return ret;
}

function addScript(config) {
  return addTag("script", config, true);
}

function awaitSetup(script) {
  return new Promise(r => {
    script.onload = () => r(script);
    // setTimeout(script.onload, 3000);
  });
}

function generateRandomId(length = 10) {
  let ret = [];
  for (let i = 0; i < length; i++) {
    ret.push(String(Math.floor(Math.random() * 9)));
  }
  return ret.join("");
}

export class TerminalBackend extends EventTarget {
  onmessage;
  onclose;
  terminal;

  constructor(config, termId) {
    super();
    this.config = config;
    this.termId = termId || generateRandomId();
  }

  static get alias() {
    return "terminal";
  }

  static get icon() {
    return "acode";
  }

  setup(terminal) {
    this.terminal = terminal;
  }

  close() {
    this.onclose?.();
  }

  send(data) {
    // console.log(data);
  }

  getState() {
    return {
      name: this.name,
      termId: this.termId
    };
  }

  static fromState(state, cls) {
    cls = cls || WebSocketBackend;
    return new cls(state.termId);
  }
}

export class AcodeBackend extends TerminalBackend {
  #commands;
  #parentDirectory;
  #currentDirectory;

  constructor(...args) {
    super(...args);

    this.#parentDirectory =
      openFolder.find(editorManager.activeFile.uri)?.url ||
      (window.addedFolder || [])[0]?.url ||
      "/";
    this.#currentDirectory = this.#parentDirectory;

    this.#commands = {
      cd: {
        handler: async data => {
          let dir = url?.join(this.#currentDirectory, data || "");

          if (await fs(dir).exists()) {
            this.#currentDirectory = dir;
          } else {
            this.term.write(color("\r\n No such directory.", "red"));
          }
        },
        description: "Change current durectory.",
        help: ["cd: Go to home directory", "cd <directory>: Go to directory"]
      },
      ls: {
        handler: async dir => {
          for (let item of await fs(
            this.#currentDirectory,
            dir || ""
          ).lsDir()) {
            let stat = await fs(item.url).stat();
            this.term.write("\r\n");
            if (stat.isDirectory) {
              this.term.write(color(item.name, "blue"));
            } else {
              this.term.write(item.name);
            }
          }
        },
        description: "List items in directory.",
        help: [
          "ls: List this directory",
          "ls <directory>: List content of <directory>"
        ]
      },
      help: {
        handler: cmd => {
          if (cmd) {
            this.term.write("\r\n* " + `'${cmd}'`);
            let command = this.#commands[cmd];
            this.term.write(
              "\r\n" +
                `* ${color("Description:", "green", null, ["bold"])} ` +
                "\r\n\t" +
                command.description
            );
            this.term.write(
              "\r\n" +
                `* ${color("Help:", "green", null, ["bold"])} ` +
                "\r\n\t" +
                command.help.join("\r\n\t")
            );
          } else {
            this.term.write("\r\n* Available Commands");
            for (cmd in this.#commands) {
              let command = this.#commands[cmd];
              this.term.write("\r\n" + `* '${cmd}': ${command.description}`);
            }
          }
        },
        description: "Display help menu.",
        help: ["help: Show Help", "help <command>: Show help on command."]
      }
    };
  }

  get term() {
    return this.terminal.term;
  }

  setup(terminal) {
    this.terminal = terminal;

    let { term } = terminal;
    let command = "";

    this.commandHandler = this.runCommand.bind(this);

    term.onData(async e => {
      switch (e) {
        case "\u0003": // Ctrl+C
          term.write("^C");
          this.prompt();
          break;
        case "\r": // Enter
          this.commandHandler(command);
          command = "";
          break;
        case "\u007F": // Backspace (DEL)
          // Do not delete the prompt
          if (term._core.buffer.x > 2) {
            term.write("\b \b");
            if (command.length > 0) {
              command = command.substr(0, command.length - 1);
            }
          }
          break;
        default:
          // Print all other characters for demo
          if (
            (e >= String.fromCharCode(0x20) &&
              e <= String.fromCharCode(0x7e)) ||
            e >= "\u00a0"
          ) {
            command += e;
            term.write(e);
          }
      }
    });

    this.prompt();
  }

  prompt() {
    this.term.write(
      "\r\n " +
        color(
          `${this.#currentDirectory.replace(this.#parentDirectory, "~")}`,
          "green",
          null
        ) +
        " $ "
    );
  }

  async runCommand(command) {
    let args = command.trim().split(" ");
    if (!args.length) {
      return this.prompt();
    }

    let mainCommand = args[0];
    // console.log(command, mainCommand)
    let cmd = this.#commands[mainCommand];
    if (cmd) {
      try {
        await cmd.handler(...args.slice(1));
      } catch {
        this.term.write(color("\r\n Error executing command.", "red"));
      }
    } else {
      this.term.write(color("\r\n Invalid command", "red"));
    }

    this.prompt();
  }

  static get alias() {
    return "acode";
  }
}

export class PtyHostBackend extends TerminalBackend {
  constructor({ command, onmessage, plugin } = {}) {
    super();

    this.command = command || plugin?.settings.command;
    this.onmessage = onmessage;

    this.$prms = this.init();
  }

  get name() {
    return "pty-host";
  }

  static get alias() {
    return "pty-host";
  }

  async init() {
    this.$conn = await pty.host.run({
      command: this.command || "bash",
      onmessage: data => {
        this.onmessage?.(data);
      }
    });

    this.$conn.addEventListener("close", () => {
      if (this.terminal) {
        this.terminal.term.write(
          "\r\n" +
            color(
              "[Connection closed - Press enter to exit]",
              "white",
              "on_red"
            ) +
            "\r\n"
        );
        this.terminal.term.onData(data => {
          if (this.$conn.state === 3) {
            if (data === "\r") {
              this.terminal.destroy();
            }
          }
        });
      }
      this.close?.();
    });
  }

  setup(terminal) {
    this.terminal = terminal;
  }

  async send(data) {
    this.$prms && (await this.$prms);
    this.$conn?.send(data);
  }

  close() {
    this.$conn?.kill();
  }

  resize({ cols, rows } = {}) {}
}

export class WebSocketBackend extends TerminalBackend {
  name = "websocket";
  terminal;
  #sendQ;

  constructor({ command = null, url = "", onmessage = null } = {}, ...args) {
    super({}, ...args);

    this.#sendQ = [];
    this.command = command;
    this.onmessage = onmessage;

    url && this.init(url);
  }

  async init(url, onmessage) {
    this.socket = new WebSocket(
      typeof url === "function" ? await url.bind(this)() : url
    );
    this.socket.binaryType = "arraybuffer";

    this.$chunks = "";
    this.$recvSize = null;

    this.socket.onmessage = onmessage || this.onSocketMessage();

    this.socket.onopen = () => {
      // if (this.terminal) {
      //   this.terminal.term.loadAddon(
      //     new AttachAddon.AttachAddon(this.socket)
      //   );
      // }
      for (let item of this.#sendQ) {
        this.socket.send(item);
      }
      this.onopen?.bind(this)();
    };

    this.socket.onclose = ev => {
      // console.log(ev);
      if (this.terminal) {
        this.terminal.term.write(
          "\r\n" +
            color(
              "[Connection to server closed - Press enter to exit]",
              "white",
              "on_red"
            ) +
            "\r\n"
        );
        this.terminal.term.onData(data => {
          if (this.socket.readyState == 3) {
            if (data === "\r") {
              this.terminal.destroy();
            }
          }
        });
      }
      this.close(false);
    };
  }

  onSocketMessage() {
    return ({ data }) => {
      if (data && typeof data == "string") {
        this.onmessage?.bind(this)(data);
        return this.terminal?.saveTerminals();

        //   if (!this.$recvSize) {
        //     let [size, text] = data.split("\r\n\r\n");
        //     this.$recvSize = Number(size);
        //     this.$chunks = this.$chunks + text;
        //   } else {
        //     this.$chunks = this.$chunks + data;
        //   }

        //   console.log(this.$chunks)
        //   console.log(this.$recvSize, this.$chunks.length)

        //   if (this.$chunks.length >= this.$recvSize) {
        //     this.onmessage?.bind(this)(this.$chunks);
        //     this.terminal?.saveTerminals();

        //     this.$recvSize = null;
        //     this.$chunks = "";
        //   }
        // }
      }
    };
  }

  send(data) {
    if (!this.socket || this.socket.readyState !== 1) {
      this.#sendQ.push(data);
    } else {
      this.socket.send(data);
    }
  }

  setup(terminal) {
    this.terminal = terminal;
    if (this.socket?.readyState == 1) {
      // terminal.term.loadAddon(new AttachAddon.AttachAddon(this.socket));
    }

    // terminal.addTermOption("Clear Terminal", () => {
    //   if (this.socket.readyState == 1) {
    //     this.send("clear\r");
    //   }
    // });

    terminal.addTermOption(["Reconnect Server", "refresh"], () => {
      if (this.socket.readyState == 3) {
        terminal.term.write(
          "\r\n" +
            color("[Reconnecting to server...]", "white", "on_green") +
            "\r\n\r\n"
        );
        this.init(this.socket.url);
      }
    });
  }

  getState() {
    return {
      name: this.name,
      termId: this.termId,
      config: {
        command: this.command
      },
      url: this.socket?.url
    };
  }

  static fromState(state, cls) {
    cls = cls || WebSocketBackend;
    return new cls(
      {
        url: state.url,
        restored: true,
        ...state.config
      },
      state.termId
    );
  }

  close(trigger = true) {
    this.socket?.close();
    trigger && this.onclose?.bind(this)();
  }

  static get alias() {
    return "websocket";
  }
}

export class TermuxBackend extends WebSocketBackend {
  static icon = "acode_terminal";

  name = "termux";

  constructor(config, ...args) {
    let host = config.host || "http://localhost:9001";
    let plugin = config.plugin;
    if (plugin) {
      host = plugin.settings.host;
    }

    if (!host.endsWith("/")) {
      host = host + "/";
    }

    let cmd = config.command || plugin?.settings.command;

    super(
      {
        url() {
          this.host = host;
          return (
            host.replace("http", "ws") +
            "terminal/" +
            this.termId +
            (cmd ? "?cmd=" + cmd : "")
          );
        },
        ...config
      },
      ...args
    );
  }

  async resize({ rows, cols }) {
    try {
      await fetch(this.host + "resize/" + this.termId, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          rows,
          cols
        }),
        mode: "no-cors"
      });
    } catch {
      // console.log(e);
    }
  }

  static fromState(state, cls) {
    return WebSocketBackend.fromState(state, TermuxBackend);
  }

  static get alias() {
    return "termux";
  }
}

export class AcodeXBackend extends WebSocketBackend {
  name = "acodex";

  constructor(config, ...args) {
    super(config, ...args);

    this.port = String(appSettings.value["bajrangcoder.acodex"]?.port || 8767);

    fetch("http://localhost:" + this.port + "/terminals?cols=80&rows=24", {
      method: "POST"
    })
      .then(resp => resp.text())
      .then(pid => {
        this.termId = pid;
        this.init("ws://localhost:" + this.port + "/terminals/" + pid);
      });
  }

  async resize({ rows, cols }) {
    try {
      await fetch(
        "http://localhost:" +
          this.port +
          `/terminals/${this.termId}` +
          `/size?rows=${rows}&cols=${cols}`,
        {
          method: "POST"
        }
      );
    } catch {
      // console.log(e);
    }
  }

  static fromState(state, cls) {
    return WebSocketBackend.fromState(state, AcodeXBackend);
  }

  static get alias() {
    return "acodex";
  }
}

export class ExecutorBackend extends WebSocketBackend {
  name = "executor";

  constructor(config, ...args) {
    super(config, ...args);

    (async () => {
      if (config.restored) return this.close();

      let host = config.host || "http://localhost:9001";
      let plugin = config.plugin;
      if (plugin) {
        host = plugin.settings.host;
      }

      if (!host.endsWith("/")) {
        host = host + "/";
      }

      let cmd =
        config.command ||
        (prevCmd = await (window.acode ? window.acode : window).prompt(
          "Enter command",
          prevCmd
        ));
      this.cmd = cmd;

      if (!cmd) return this.close();

      let url = true /* config.interactive */
        ? host.replace("http", "ws") +
          "terminal/" +
          this.termId +
          "?shell&cmd=" +
          cmd
        : host.replace("http", "ws") + "execute?cmd=" + cmd;

      await this.init(url);

      let start = new Date();
      let origOpen = this.socket.onopen;
      // let origClose = this.socket.onclose;

      this.socket.onopen = () => {
        origOpen && origOpen();

        this.terminal?.term.write(
          this.terminal.color("[Running]", "blue") +
            " " +
            this.terminal.color(`"${this.cmd}"`, "red") +
            "\r\n\r\n"
        );
      };

      this.socket.onclose = ev => {
        // console.log(ev.code);

        // if (ev.code !== 1000) {
        // return;
        // }

        let end = new Date();

        this.terminal?.term.write(
          "\r\n" +
            this.terminal.color("[Done]", "blue") +
            " " +
            this.terminal.color(
              `exited with code=0 in ${Math.round(
                (end - start) / 1000
              )} seconds`,
              "red"
            ) +
            "\r\n\r\n" +
            this.terminal.color("[Press enter to exit]", "white", "on_red") +
            "\r\n"
        );

        this.terminal?.term.onData(data => {
          if (this.socket.readyState == 3) {
            if (data === "\r") {
              this.terminal.destroy();
            }
          }
        });
      };
    })();
  }

  onSocketMessage() {
    let interval = null,
      chunks = [];

    let sendChunks = () => {
      this.onmessage?.bind(this)(chunks.join(""));
      chunks = [];
      this.terminal?.saveTerminals();
    };

    return ({ data }) => {
      chunks.push(data);
      if (interval) clearInterval(interval);
      interval = setInterval(sendChunks, 100);
    };
  }

  setup(terminal) {
    super.setup(terminal);

    terminal.addTermOption(["Kill Program", "cancel"], () => {
      if (this.socket.readyState !== 3) {
        this.close();
      }
    });
  }

  getState() {
    let state = super.getState();
    state.config.command = this.cmd;
    return state;
  }

  static fromState(state, cls) {
    return WebSocketBackend.fromState(state, ExecutorBackend);
  }

  static get alias() {
    return "executor";
  }
}

export class ProgramExecutor extends WebSocketBackend {
  name = "program_executor";
  static alias = "program_executor";

  constructor(config, ...args) {
    super(config, ...args);

    (async () => {
      if (config.restored) return this.close();

      let host = config.host || "http://localhost:9001";
      let plugin = config.plugin;
      if (plugin) {
        host = plugin.settings.host;
      }

      if (!host.endsWith("/")) {
        host = host + "/";
      }

      let cmd = (this.cmd = config.command);
      // console.log(cmd)
      if (!cmd) return this.close();

      let url = host.replace("http", "ws") + "execute?cmd=" + cmd;
      // console.log(url)
      await this.init(url, ({ data }) => {
        if (!data) return;

        this.onmessage?.bind(this)(JSON.parse(data));
        this.terminal?.saveTerminals();
      });
    })();
  }
}

export class SSHBackend extends ExecutorBackend {
  name = "ssh";

  constructor(config, ...args) {
    super(
      {
        command: "ssh",
        ...config
      },
      ...args
    );
  }

  static fromState(state, cls) {
    return WebSocketBackend.fromState(state, SSHBackend);
  }

  static get alias() {
    return "ssh";
  }
}

export class AcodeTerminal {
  #fit;
  #term;
  #prms;
  #webgl;
  #search;
  #serialize;
  #onresize;
  #ctrlPressed;

  #termOptions;
  #termActions;
  ondestroy;

  static alias = "acodeTerminal";
  name = "acodeTerminal";

  constructor({
    config = {},
    backend = null,
    command = null,
    termData = null,
    plugin = null
  } = {}) {
    this.#termOptions = [];
    this.#termActions = [];

    this.#term = new Terminal({
      fontSize: 11,
      scrollback: 1000,
      cursorBlink: true,
      macOptionIsMeta: true,
      allowProposedApi: true,
      scrollSensitivity: 200,
      scrollOnUserInput: true,
      allowTransparency: true,
      theme: themes.xterm,

      ...config
    });
    this.command = command;
    this.termData = termData;
    this.plugin = plugin;

    this.#term.loadAddon((this.#fit = new FitAddon()));

    this.#term.loadAddon(
      new WebLinksAddon(async (ev, url) => {
        if (await acode.confirm("Go To Link", `Open in browser: '${url}'?`)) {
          Browser.open(url);
        }
      })
    );
    this.#term.loadAddon((this.#search = new SearchAddon()));
    this.#term.loadAddon((this.#serialize = new SerializeAddon()));

    try {
      this.#term.loadAddon((this.#webgl = new WebglAddon()));
    } catch {
      this.#webgl.dispose();
    }

    if (termData) {
      this.#term.write(termData + "\r\n");
      this.#term.write(
        "\r\n\r\n" +
          color("[History Restored]", "black", "on_cyan") +
          "\r\n\r\n"
      );
    }

    if (backend) {
      this.#prms = this.setBackend(backend);
    }
  }

  #close() {
    this.#term.dispose();
    this.backend.close();
  }

  get term() {
    return this.#term;
  }

  color(text, ...args) {
    return color(text, ...args);
  }

  get settings() {
    return this.plugin?.settings || {};
  }

  setAlt(cb) {
    this.altPressed = true;
    this.onaltclear = cb;
  }
  clearAlt() {
    this.altPressed = false;
    this.onaltclear && this.onaltclear();
  }

  setCtrl(cb) {
    this.ctrlPressed = true;
    this.onctrlclear = cb;
  }
  clearCtrl() {
    this.ctrlPressed = false;
    this.onctrlclear && this.onctrlclear();
  }

  async setup(container, backend) {
    this.container = container;

    this.#prms && (await this.#prms);

    if (backend) await this.setBackend(backend);

    this.term.open(container);

    this.resize();

    this.#onresize = debounce(this.resize.bind(this), 0);
    window.addEventListener("resize", this.#onresize);

    this.term.onData(data => {
      // console.log(data);
      if (this.ctrlPressed && data?.length == 1) {
        this.clearCtrl();

        let keyCode = getKeyCode(data);
        keyCode && (data = eval("'\\x" + keyCode + "'"));
      } else if (this.altPressed && data.length == 1) {
        this.clearAlt();

        data = eval("'\\x1b" + data + "'");
      }
      this.backend?.send(data);
    });

    this.#onresize();
  }

  addTermOption(option, handler) {
    if (Array.isArray(option)) {
      this.#termOptions.push([
        option[0],
        option[0],
        option[1],
        ...option.slice(1)
      ]);
      this.#termActions[option[0]] = handler;
    } else {
      this.#termOptions.push(option);
      this.#termActions[option] = handler;
    }
  }

  get termOptions() {
    return this.#termOptions;
  }

  get termActions() {
    return this.#termActions;
  }

  async setBackend(backend) {
    this.backend = backend;

    await this.backend.setup(this);

    this.backend.onmessage = message => {
      this.term.write(message);
    };
  }

  fit() {
    const { rows, cols } = this.#fit?.proposeDimensions() || {};
    if (rows && cols) {
      this.#term.resize(cols + 2, rows - 4);
    }
  }

  resize(cols, rows) {
    this.fit();

    if (cols && rows) {
      this.#term.resize(cols, rows);
      // this.fit();
    }

    if (this.backend?.resize) {
      this.backend.resize({
        cols: this.term.cols + 2,
        rows: this.term.rows - 4
      });
    }
  }

  execute(command) {
    this.backend.send.bind(this.backend)(command + "\r");
  }

  saveTerminals() {
    this.plugin && this.plugin.saveTerminals();
  }

  destroy() {
    this.#fit?.dispose();
    this.#webgl?.dispose();
    this.#search?.dispose();

    this.#close();

    window.removeEventListener("resize", this.#onresize);
    this.ondestroy && this.ondestroy();
  }

  getState() {
    return {
      name: this.name,
      backend: this.backend?.getState.bind(this.backend)(),
      termData: this.#serialize.serialize()
    };
  }
}

class AcodeTerminalPlugin {
  #ui;
  #terms;
  #termCount = 1;
  #activeTerm;
  #terminals;
  #termState;
  #stateFile;
  #saveInterval;
  #saveTimeout;
  #settingsPage;

  constructor() {
    this.#terms = new Map();
    this.#ui = new Object();

    this.terminals = new Array();
    this.#terminals = [AcodeTerminal];

    this.backends = [
      PtyHostBackend,
      TermuxBackend,
      AcodeXBackend,
      AcodeBackend,
      SSHBackend,
      ExecutorBackend
      // ProgramExecutor
    ];
  }

  async initialize() {
    this.#stateFile = fs(CACHE_STORAGE, "acode.terminal.state");

    if (!(await this.#stateFile.exists())) {
      await fs(CACHE_STORAGE).createFile("acode.terminal.state");
    }

    this.page = new Page("Terminal");
    this.main = this.page.querySelector(".main");
    this.page.setAttribute("id", "acodeTerm");

    this.page.show = () => {
      actionStack.push({
        id: "acode.terminal",
        action: this.page.hide
      });
      app.append(this.page);
    };

    this.page.onhide = function () {
      actionStack.remove("acode.terminal");
    };

    let settings = appSettings.value["terminal"];
    if (!settings) {
      appSettings.value["terminal"] = settings = this.defaultSettings;
      appSettings.update();
    }

    await this.setup();

    this.exports = {
      // SSHBackend,
      AcodeBackend,
      AcodeTerminal,
      AcodeXBackend,
      TermuxBackend,
      ExecutorBackend,
      TerminalBackend,
      ProgramExecutor,
      PtyHostBackend,

      themes: { ...themes },

      addBackend: backend => {
        if (!this.backends.includes(backend)) {
          this.backends.push(backend);
        }
      },
      removeBackend: backend => {
        this.backends = this.backends.filter(i => i !== backend);
      },

      addTerminal: terminal => {
        if (!this.#terminals.includes(terminal)) {
          this.#terminals.push(terminal);
        }
      },
      removeTerminal: terminal => {
        if (terminal == AcodeTerminal) return;
        this.#terminals = this.#terminals.filter(i => i !== terminal);
      },

      execute(command, { signal = null } = {}) {
        return new Promise((resolve, reject) => {
          let $backend = new ProgramExecutor({ command });
          $backend.onmessage = res => resolve(res);

          signal?.addEventListener("abort", () => {
            $backend.socket?.close();
            reject("Program aborted.");
          });
        });
      },

      run(command, onmessage) {
        let $backend = new ExecutorBackend({ command });
        $backend.onmessage = onmessage;
        return $backend;
      },

      show: this.#togglePage.bind(this),
      newTerminal: this.newTerminal.bind(this),
      createTerminal: this.createTerminal.bind(this),

      formatUrl,
      color
    };

    acode.define("terminal", this.exports);

    addCustomSettings(
      {
        key: "terminal-settings",
        text: strings["terminal"] || "Terminal",
        index: 0, icon: "tune"
      },
      (this.#settingsPage = settingsPage(
        "Terminal",
        [
          {
            index: 0,
            key: "theme",
            text: "Theme",
            value: settings.theme,
            info: "Terminal theme",
            select: THEME_LIST
          },
          {
            index: 0,
            key: "command",
            text: "Shell command",
            value: settings.command,
            info: "Shell command for terminal",
            prompt: "Enter Command",
            promptType: "text"
          },
          {
            index: 0,
            key: "backend",
            text: "Backend",
            value: settings.backend,
            info: "Default Terminal backend",
            select: this.backends.map(i => i.alias || i.name)
          },
          {
            index: 0,
            key: "host",
            text: "Server Host",
            value: settings.host,
            info: "Address for the server.",
            prompt: "Enter address",
            promptType: "url"
          },
          {
            index: 1,
            key: "cursorBlink",
            text: "Cursor Blink",
            info: "Whether the cursor blinks.",
            checkbox: !!settings.cursorBlink
          },
          {
            index: 2,
            key: "cursorStyle",
            text: "Cursor Style",
            value: settings.cursorStyle,
            info: "The style of the cursor.",
            select: [CURSOR_STYLE[0], CURSOR_STYLE[1], CURSOR_STYLE[2]]
          },
          {
            index: 3,
            key: "cursorInactiveStyle",
            text: "Inactive Cursor Style",
            value: settings.cursorInactiveStyle,
            info: "The cursor style of the terminal when not focused.",
            select: CURSOR_INACTIVE_STYLE
          },
          {
            index: 4,
            key: "fontSize",
            text: "Font Size",
            value: settings.fontSize,
            info: "Terminal font size.",
            prompt: "Font Size",
            promptType: "number",
            promptOption: [
              {
                match: /^[0-9]+$/,
                required: true
              }
            ]
          },
          {
            index: 5,
            key: "fontWeight",
            text: "Font Weight",
            value: settings.fontWeight || FONT_WEIGHT[1],
            info: "The font weight used to render text.",
            select: FONT_WEIGHT
          },
          // {
          //   index: 5,
          //   key: "fontFamily",
          //   text: "Font Family",
          //   value: settings.fontFamily,
          //   info: "The font family used to render text.",
          //   select: this.fontsList,
          // },
          {
            index: 6,
            key: "scrollBack",
            text: "Scroll Back",
            value: settings.scrollBack,
            info: "The amount of scrollback in the terminal. Scrollback is the amount of rows that are retained when lines are scrolled beyond the initial viewport.",
            prompt: "Scroll Back",
            promptType: "number",
            promptOption: [
              {
                match: /^[0-9]+$/,
                required: true
              }
            ]
          },
          {
            index: 7,
            key: "scrollSensitivity",
            text: "Scroll Sensitivity",
            value: settings.scrollSensitivity,
            info: "The scrolling speed multiplier used for adjusting normal scrolling speed.",
            prompt: "Scroll Sensitivity",
            promptType: "number",
            promptOption: [
              {
                match: /^[0-9]+$/,
                required: true
              }
            ]
          }
        ],
        (key, value) => {
          if (key === "command" || key === "backend") {
          } else if (key === "host") {
            value = value.replace("8080", "9001");
          } else {
            this.terminals.map(i => {
              i.term.options[key] = key == "theme" ? themes[value] : value;
            });
          }

          this.settings[key] = value;
          appSettings.update();
        }
      ))
    );
  }

  async setup() {
    // acode.addIcon("acode_terminal", url.join(this.baseUrl, "term_icon.png"));
    if (sideButton) {
      this.sBtn = sideButton({
        bottom: false,
        text: "Terminal",
        icon: "android-full",
        onclick: this.#togglePage.bind(this),
        backgroundColor: "#656c76fd",
        textColor: "white"
      });
      this.sBtn.show();
    } else {
      this.sBtn = tag("span", {
        className: "icon acode_terminal",
        attr: {
          action: "run"
        },
        onclick: () => this.page.show()
      });
      let header = window.root?.get("header");
      header?.insertBefore(this.sBtn, header.lastChild);
    }
    this.#setupUi();

    await this.loadTerminals();

    // this.#saveInterval = setInterval(() => this.#saveTerminals(), 3000);
  }

  async createTerminal(
    container,
    {
      backend = null,
      termId = null,
      terminal = AcodeTerminal,
      termData = null,
      backendConfig = null
    } = {}
  ) {
    backend = this.#getBackend(
      backend,
      {
        ...(backendConfig || {
          command: this.settings.command
        }),
        plugin: this
      },
      termId
    );
    // if (!backend) throw new Error("No or invalid backend specified.");

    terminal = this.#getTerminal(terminal);
    if (!terminal) {
      terminal = AcodeTerminal;
    }

    let instance = new terminal({
      backend,
      termData,
      plugin: this,
      config: {
        scrollback: this.settings.scrollBack,
        cursorBlink: this.settings.cursorBlink,
        cursorStyle: this.settings.cursorStyle,
        cursorInactiveStyle: this.settings.cursorInactiveStyle,
        scrollSensitivity: this.settings.scrollSensitivity,
        fontSize: this.settings.fontSize,
        // fontFamily: this.settings.fontFamily,
        fontWeight: this.settings.fontWeight,
        theme: themes[this.settings.theme]
      }
    });

    container && instance.setup(container);

    this.terminals.push(instance);

    instance.resize();

    return instance;
  }

  #setupUi() {
    this.#ui.tabContent = tag("div", {
      className: "col-12 tab-content"
    });

    this.#ui.leftBar = tag("div", {
      className: "col-1 tabs-left-bar",
      children: []
    });

    this.#ui.tabsContainer = tag("div", {
      className: "row col-10 nav nav-tabs tabs-container"
    });

    this.#ui.rightBar = tag("div", {
      className: "col-12 d-flex flex-row tabs-right-bar",
      children: this.#createUiRightBar()
    });

    this.#ui.tabHeader = tag("div", {
      className: "row tab-headers",
      children: [
        // this.#ui.leftBar,
        this.#ui.tabsContainer
        // this.#ui.rightBar,
      ]
    });

    this.#ui.quicktools = tag("div", {
      id: "quicktools",
      className: "col-12",
      children: this.#quickTools()
    });

    this.#ui.tabs = tag("div", {
      className: "tabs",
      children: [this.#ui.tabHeader, this.#ui.tabContent, this.#ui.quicktools]
    });

    this.main.appendChild(this.#ui.tabs);
    this.page.querySelector("header .tail").appendChild(this.#ui.rightBar);
  }

  async newTerminal(termConfig = {}, saveTerms = true, changeDir = true) {
    let term;
    let termNum = this.#termCount++;
    let tabId = `tab-${generateRandomId(5)}`;
    const tabBody = tag("div", { className: "tab-body", id: tabId });

    const tab = tag("div", {
      className: "col d-flex flex-row nav-link tab",
      children: [
        tag("div", {
          className: "col-9 tab-header",
          textContent: "Terminal"
        }),
        // tag("button", {
        //   className: "col btn btn-sm btn-danger close-tab",
        //   textContent: "x",
        // }),
        tag("span", {
          className: "term-number",
          textContent: termNum
        })
      ],
      onclick: ({ target }) => {
        if (target.classList.contains("close-tab")) {
          return term.destroy();
        } else {
          this.#setActiveTab(tab);
        }
      }
    });

    const menu = contextmenu({
      top: 100,
      left: 100
      // toggler: true,
      // onshow: () => console.log("Show"),
      // onhide: () => console.log("Hide"),
    });
    menu.setAttribute("id", "term-context-menu");
    menu.appendChild(this.#tabContextMenu());

    // tabBody.onkeyup = (event) =>
    // console.log(event.key, event.code, event.type);

    tab.setAttribute("tab-id", tabId);
    tab.setAttribute("term-num", termNum);

    term = await this.createTerminal(tabBody, termConfig);
    term.term.onTitleChange(title => {
      tab.querySelector(".tab-header").innerText = title;
    });
    term.ondestroy = () => {
      if (this.#activeTerm == term) {
        this.#activeTerm = null;
      }

      let nextTab = tab.previousElementSibling
        ? tab.previousElementSibling
        : tab.nextElementSibling;
      nextTab && this.#setActiveTab(nextTab);

      tabBody.remove();
      tab.remove();

      this.terminals = this.terminals.filter(t => t !== term);
      this.saveTerminals();
    };

    if (changeDir) {
      let activeFile = editorManager.activeFile;
      if (activeFile?.uri) {
        let folder = openFolder.find(activeFile.uri);
        if (folder?.url) {
          term.execute(`cd "${formatUrl(folder.url)}"`);
        }
      }
    }

    term.term.attachCustomKeyEventHandler(
      this.#customKeyEventHandler.bind(this)
    );
    term.menu = menu;
    // Show the context menu
    tabBody.oncontextmenu = ev => {
      ev.preventDefault();
      menu.show();
      term.term.focus();
    };

    saveTerms && (await this.saveTerminals());

    this.#terms.set(tabId, term);

    this.#ui.tabsContainer.appendChild(tab);
    this.#ui.tabContent.appendChild(tabBody);

    this.#setActiveTab(tab);

    return term;
  }

  #tabContextMenu() {
    return (this.#ui.contextmenu = tag("div", {
      className: "col row",
      children: [
        tag("span", {
          className: "col icon copy",
          onclick: () => {
            let { term } = this.#activeTerm;
            const toCopy = term.getSelection();
            cordova.plugins.clipboard.copy(toCopy).then(() => {
              acode.toast("Text copied.");
            });
            term.focus();
          }
        }),
        // tag("span", {
        //   className: "col icon cut",
        // }),
        tag("span", {
          className: "col icon paste",
          onclick: async () => {
            let { term } = this.#activeTerm;
            cordova.plugins.clipboard.paste(text => {
              term.paste(text);
            });
          }
        })
      ]
    }));
  }

  #setActiveTab(tab) {
    let tabId = tab.getAttribute("tab-id");
    let tabBody = this.#ui.tabContent.querySelector("#" + tabId);

    Array.from(document.querySelectorAll(".tab.active")).map(tab =>
      tab.classList.remove("active")
    );

    Array.from(document.querySelectorAll(".tab-body.show")).map(tab =>
      tab.classList.remove("show")
    );

    tab.classList.add("active");
    tabBody.classList.add("show");

    let term = this.#terms.get(tabId);
    this.#activeTerm = term;
    term.term.focus();
  }

  #splitTabWIth(tab, targetTab) {
    let tabBody = this.#ui.tabContent.querySelector(
      "#" + tab.getAttribute("tab-id")
    );
    let targetTabBody = this.#ui.tabContent.querySelector(
      "#" + targetTab.getAttribute("tab-id")
    );

    targetTabBody.append(tabBody.children[0]);
  }

  #togglePage() {
    this.page.show();
  }

  async #saveTerminals() {
    let terms = this.terminals.map(term => term.getState());
    if (terms == this.#termState) return;
    this.#termState = terms;
    // console.log(terms);
    await this.#stateFile?.writeFile(JSON.stringify(terms), "utf-8");
  }

  async saveTerminals() {
    if (!this.#saveTimeout) {
      this.#saveTimeout = setTimeout(() => {
        this.#saveTimeout = null;
        this.#saveTerminals();
      }, 1000);
    }
  }

  async loadTerminals() {
    let data = await this.#stateFile?.readFile("utf-8");
    if (data) {
      for (let item of JSON.parse(data)) {
        let terminal = item.name;
        let backend = this.#getBackend(
          item.backend?.name,
          item.backend.config,
          item.backend?.termId
        );

        await this.newTerminal(
          {
            terminal,
            backend,

            termData: item.termData
          },
          false
        );
      }
    }
  }

  #createUiRightBar() {
    this.#ui.addTabBtn = tag("span", {
      className: "col-5 icon add",
      onclick: () => this.newTerminal()
    });
    return [
      tag("div", {
        className: "d-flex flex-row col-6 btn-wrapper",
        children: [
          this.#ui.addTabBtn,
          tag("span", {
            className: "col-5 icon expand_more",
            onclick: async () => {
              let backend = await acode.select(
                "Select Backend",
                this.backends.map(backend => [
                  backend.alias,
                  backend.alias,
                  backend.icon
                ])
              );
              if (backend) {
                this.defaultBackend = backend;
                this.newTerminal({ backend });
              }
            }
          })
        ]
      }),
      // this.#ui.profileSelect,
      tag("span", {
        className: "col icon delete",
        onclick: () => {
          this.#activeTerm?.destroy();
        }
      }),
      tag("span", {
        className: "col icon more_vert",
        onclick: async () => {
          let action = await acode.select("Select Action", [
            ["cd", "Go To Current Directory", "folder"],

            ["new", "Create Terminal", "add"],
            ["clear", "Clear Terminal", "clearclose"],
            ["close", "Close Terminal", "delete"],

            ["settings", "Terminal Settings", "settings"],
            ...(this.#activeTerm ? this.#activeTerm.termOptions : [])
          ]);
          switch (action) {
            case "new":
              this.newTerminal();
              break;
            case "close":
              this.#activeTerm?.destroy();
              break;
            case "clear":
              this.#activeTerm?.term.clear();
              break;
            case "cd":
              let uri = editorManager.activeFile.uri;
              if (!uri) return;
              let cd = url.dirname(uri);
              cd = formatUrl(cd);
              this.#activeTerm?.execute(`cd "${cd}"`);
              break;
            case "settings":
              this.#settingsPage?.show();
            default:
              let actions = this.#activeTerm?.termActions;
              if (actions && (action = actions[action])) {
                await action();
              }
          }
        }
      })
    ];
  }

  #quickTools() {
    let ctrl, alt;
    let self = this;

    let tools = [
      [
        {
          text: "ctrl",
          onclick() {
            if (!self.#activeTerm?.ctrlPressed) {
              self.#activeTerm.setCtrl(() => {
                this.style.color = "unset";
              });
              this.style.color = "red";
            } else {
              self.#activeTerm.clearCtrl();
              this.style.color = "unset";
            }
          }
        },
        { icon: "keyboard_tab", text: "\t" },
        { text: "/" },
        { text: "home" },
        { icon: "keyboard_arrow_up", text: "\u001b[A" },
        { text: "end" },
        { text: "pgup" }
      ],
      [
        {
          icon: "folder-outline",
          onclick: () => {
            let uri = editorManager.activeFile.uri;
            if (!uri) return;
            let cd = url.dirname(uri);
            cd = formatUrl(cd);
            this.#activeTerm.execute(`cd "${cd}"`);
          }
        },
        { text: "esc" },
        {
          text: "alt",
          onclick() {
            if (!self.#activeTerm?.altPressed) {
              self.#activeTerm.setAlt(() => (this.style.color = "unset"));
              this.style.color = "red";
            } else {
              self.#activeTerm.clearAlt();
              this.style.color = "unset";
            }
          }
        },
        { icon: "keyboard_arrow_left", text: "\u001b[D" },
        { icon: "keyboard_arrow_down", text: "\u001b[B" },
        { icon: "keyboard_arrow_right", text: "\u001b[C" },
        { text: "pgdn" }
      ]
    ];

    let textToCmd = {
      esc: "\x1b",
      home: "\x1b[H",
      end: "\x1b[F",
      pgup: "\u001b[1S",
      pgdn: "\u001b[1T"
    };

    let main = items =>
      items.map(({ icon, onclick, text, write }) => {
        let extra = {};
        if (text && !icon) {
          icon = "letters";
          extra["attr"] = { "data-letters": text };
        }
        let i;
        let held = false;

        let handler = function (focus = true) {
          if (!self.#activeTerm) return;

          if (onclick) {
            onclick.bind(this)();
          } else if (write) {
            self.#activeTerm.term.write(write);
          } else if (text) {
            self.#activeTerm.backend.send(textToCmd[text] || text);
          }

          focus && self.#activeTerm.term.focus();
        };

        return tag("span", {
          className: "col icon " + icon,
          onclick: handler,
          ontouchstart(ev) {
            ev.preventDefault();
            held = true;
            handler.bind(this)(true);
            i = setInterval(() => {
              if (!held) {
                return clearInterval(i);
              }
              handler.bind(this)(true);
            }, 200);
          },
          ontouchend() {
            held = false;
          },
          ...extra
        });
      });

    return [
      tag("div", {
        className: "quicktools-div",
        children: main(tools[0])
      }),
      tag("div", {
        className: "quicktools-div",
        children: main(tools[1])
      })
    ];
  }

  #getBackend(backend, ...args) {
    if (!backend) {
      backend = this.settings.backend;
    }
    if (!backend) return;

    if (typeof backend == "string") {
      backend = this.backends.find(
        i => i.alias == backend || i.name == backend
      );
      backend = new backend(...args);
    }
    return backend;
  }

  #getTerminal(terminal) {
    if (typeof terminal == "string") {
      return this.#terminals.find(
        i => i.alias == terminal || i.name == terminal
      );
    }
    return terminal;
  }

  #customKeyEventHandler(event) {
    // console.log(event.key, event.code, event.type)
    if (event.type !== "keyup") {
      return true;
    }
    const terminal = this.#activeTerm;
    const { term } = terminal;

    const key = event.key.toLowerCase();
    const ctrlPressed = event.ctrlKey || term.ctrlPressed;

    if (event.shiftKey && ctrlPressed) {
      let tab = document.querySelector(".tab.active");

      if (key === "v") {
        // ctrl+v: paste whatever is in the clipboard
        clipboard.paste(text => {
          term.paste(text);
        });
        return false;
      } else if (key === "c" || key === "x") {
        // ctrl+x: copy whatever is highlighted to clipboard

        const toCopy = term.getSelection();
        navigator.clipboard.writeText(toCopy);
        term.focus();
        return false;
      } else if (key === "n") {
        // ctrl+n
        this.newTerminal();
        return false;
      } else if (key === "q") {
        // ctrl+q
        terminal.destroy();
        return false;
      } else if (event.keyCode >= 49 && event.keyCode <= 57) {
        // ctrl+1 to ctrl+9
        // 49 is the keyCode for '1', 50 for '2', and so on
        const num = event.keyCode - 48;
        const tab = document.querySelector(`.tab[term-num="${num}"]`);

        // const tab = document.querySelectorAll(`.tab`)[num - 1];
        if (tab) {
          this.#setActiveTab(tab);
          return false;
        }
      } else if (event.ctrlKey && event.keyCode === 37) {
        // Ctrl+Left Arrow
        const nextTab = tab.previousElementSibling;
        nextTab && this.#setActiveTab(nextTab);
      } else if (event.ctrlKey && event.keyCode === 39) {
        // Ctrl+Right Arrow
        const nextTab = tab.nextElementSibling;
        nextTab && this.#setActiveTab(nextTab);
      }
    } else if (ctrlPressed) {
      if (key == "+") {
        let fontSize = term.options.fontSize;
        term.options["fontSize"] = fontSize + 1;
        term.refresh(0, term.rows - 1);
      } else if (key == "-") {
        let fontSize = term.options.fontSize;
        if (fontSize - 1 < 1) return;

        term.options.fontSize = fontSize - 1;
        term.refresh(0, term.rows - 1);
      }
    }
    return true;
  }

  destroy() {
    sideButton ? this.sBtn?.hide() : this.sBtn.remove();
    this.tags.map(i => i.remove());
  }

  get settings() {
    return appSettings.value["terminal"];
  }

  get defaultSettings() {
    return {
      theme: "xterm",
      command: "bash",
      backend: "pty-host",
      host: "http://localhost:9001",

      cursorBlink: true,
      fontSize: FONT_SIZE,
      fontWeight: FONT_WEIGHT[1],
      // fontFamily: null,
      scrollBack: SCROLLBACK,
      scrollSensitivity: SCROLL_SENSITIVITY,
      cursorStyle: CURSOR_STYLE[0],
      cursorInactiveStyle: CURSOR_INACTIVE_STYLE[0]
    };
  }
}

export default new AcodeTerminalPlugin();
