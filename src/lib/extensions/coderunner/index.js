import pty from "lib/pty";
import Page from "components/page";
import acodeCommands from "lib/commands";
import actionStack from "lib/actionStack";
import sideButton from "components/sideButton";
import settingsPage from "components/settingsPage";

import { addCustomSettings } from "settings/mainSettings";

let Url = acode.require("url");
let fs = acode.require("fsoperation");
let helpers = acode.require("helpers");
let palette = acode.require("palette");
let appSettings = acode.require("settings");
let EditorFile = acode.require("EditorFile");
let openFolder = acode.require("openFolder");
let multiPrompt = acode.require("multiPrompt");

function getUrl(path) {
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

function select(title, options) {
  return new Promise((resolve, reject) => {
    palette(
      () =>
        options.map(option => ({
          text: option[1],
          value: option[0]
        })),
      resolve,
      title
    );
  });
}

function getDirectoryForFile(file) {
  return openFolder.find(file.uri);
}

async function runAcode(commands, signal, $page) {
  $page.innerHTML = "";

  for (let command of commands) {
    $page.settitle(`Running ${command.command} ${command.args || []}`);
    let conn = await pty.host.run({
      args: command.args,
      command: command.command
    });
    conn.addEventListener("message", ({ data }) => {
      $page.append(<p className="command-output">{data}</p>);
    });
    signal.addEventListener("abort", () => {
      conn.kill();
    });
    await conn.exit();
  }
  $page.append(<p className="command-info">Done</p>);
}

function runAcodeX(termController, signal, command) {
  if (!termController.isTerminalOpened()) {
    if (!termController.newTerminal?.()) {
      termController.openTerminal?.();
    }
  }

  termController.createSession?.();

  if (termController.isMinimized()) {
    termController.maximiseTerminal();
  }

  signal.addEventListener("abort", () => {
    termController.execute("^C");
  });

  return termController.execute(command);
}

async function runAcodeTerminal(terminal, signal, command) {
  let term = await terminal.newTerminal();

  term.backend.onclose = () => {};
  terminal.show?.();

  signal.addEventListener("abort", () => {
    term.backend.close();
  });

  return term.execute(command);
}

function shlex(str) {
  let args = str.split(" ");
  let out = [];
  let lookForClose = -1;
  let quoteOpen = false;
  for (let x in args) {
    if (args.hasOwnProperty(x)) {
      let arg = args[x];
      let escSeq = false;
      for (let y in arg) {
        if (escSeq) {
          escSeq = false;
        } else if (arg[y] === "\\") {
          escSeq = true;
        } else if (arg[y] === '"') {
          quoteOpen = !quoteOpen;
        }
      }
      if (!quoteOpen && lookForClose === -1) {
        out.push(arg);
      } else if (quoteOpen && lookForClose === -1) {
        lookForClose = x;
      } else if (!quoteOpen && lookForClose >= 0) {
        let block = args.slice(lookForClose, parseInt(x) + 1).join(" ");
        let escSeq = false;
        let quotes = [];
        for (let y in block) {
          if (escSeq) {
            escSeq = false;
          } else if (block[y] === "\\") {
            escSeq = true;
          } else if (block[y] === '"') {
            quotes.push(y);
          }
        }
        let parts = [];
        parts.push(block.substr(0, quotes[0]));
        parts.push(
          block.substr(
            parseInt(quotes[0]) + 1,
            quotes[1] - (parseInt(quotes[0]) + 1)
          )
        );
        parts.push(block.substr(parseInt(quotes[1]) + 1));
        block = parts.join("");
        out.push(block);
        lookForClose = -1;
      }
    }
  }
  return quoteOpen ? false : out;
}

function splitCommand(command) {
  let out = [];
  let commands = command.split("&&");
  for (let item of commands) {
    let splits = shlex(item.trim()) || item.trim();
    out.push({
      command: splits[0],
      args: splits.slice(0)
    });
  }
  return out;
}

class CodeRunner {
  #logger = null;

  #commands;
  #commandsUrl;

  #projectCommands = [
    // {
    //   name: "Built In Runner",
    //   icon: "play_arrow",
    //   project: true,
    //   match: file => file.canRun(),
    //   handler: (file, { contextMenu }) =>
    //     contextMenu ? file.runFile() : file.run()
    // }
  ];

  async initialize() {
    let self = this,
      data;
    this.$page = new Page("Outputs");
    this.$page.show = () => {
      actionStack.push({
        id: "coderunner",
        action: this.$page.hide
      });
      app.append(this.$page);
    };

    this.$page.onhide = function () {
      actionStack.remove("coderunner");
    };

    // if (sideButton) {
    //   this.sBtn = sideButton({
    //     text: "Outputs",
    //     icon: "settings",
    //     onclick: () => this.$page.show(),
    //     backgroundColor: "#ff4949",
    //     textColor: "white"
    //   });
    //   this.sBtn.show();
    // } else {
    //   this.sBtn = tag("span", {
    //     className: "icon settings",
    //     attr: {
    //       action: "run"
    //     },
    //     onclick: () => this.$page.show()
    //   });
    //   let header = window.root?.get("header");
    //   header?.insertBefore(this.sBtn, header.lastChild);
    // }

    this.#commandsUrl = Url.join(DATA_STORAGE, ".commands.json");
    if (!(await fs(this.#commandsUrl).exists())) {
      await fs(Url.dirname(this.#commandsUrl)).createFile(".commands.json");
      this.#commands = (await import("./commands.js")).default;
      await fs(this.#commandsUrl).writeFile(
        JSON.stringify(this.#commands),
        "utf-8"
      );
    } else {
      this.#commands = JSON.parse(
        (await fs(this.#commandsUrl).readFile("utf-8")) || "[]"
      );
    }

    this.#projectCommands.push({
      name: "NPM",
      icon: "file file_type_javascript",
      project: true,
      async match(file) {
        if (file.name == "package.json") {
          return true;
        }

        let folder = getDirectoryForFile(file);
        if (!folder) return false;

        let fs0 = await fs(Url.join(folder.url, "package.json"));
        return await fs0.exists();
      },
      async handler(file, { execute }) {
        let scripts = [["installScript", "install"]],
          value;
        let data;

        if (file.name == "package.json") {
          data = JSON.parse(file.session.getValue() || "{}");
        } else {
          let folder = getDirectoryForFile(file);

          let fs = await acode.fsOperation(
            Url.join(folder.url, "package.json")
          );
          if (await fs.exists()) {
            data = JSON.parse(await fs.readFile("utf-8"));
          } else {
            return;
          }
        }

        for (let script in data.scripts || {}) {
          scripts.push([script, script]);
        }

        if (scripts.length > 0) {
          value = await select("Select script", scripts);
        } else {
          value = await acode.prompt("Script name", "start");
        }

        if (value) {
          if (value == "installScript") {
            return await execute(
              await self.#generateCommand("npm install", file, false)
            );
          }
          return await execute(
            await self.#generateCommand(`npm run ${value}`, file, false)
          );
        }
      }
    });

    this.#projectCommands.push({
      name: "Edit commands.json",
      icon: "file file_type_json",
      match: file => true,
      handler: () => {
        new EditorFile(Url.basename(this.#commandsUrl), {
          uri: this.#commandsUrl
        });
      },
      project: true, ignorable: true
    });

    this.#projectCommands.push({
      name: "Django",
      icon: "file file_type_python",
      project: true,
      async match(file) {
        let folder = getDirectoryForFile(file);
        if (!folder) return false;

        let fs = await acode.fsOperation(Url.join(folder.url, "manage.py"));
        return await fs.exists();
      },
      async handler(file, { execute }) {
        let folder = getDirectoryForFile(file);
        let folderUrl = getUrl(folder.url);

        let commands = [
          ["runserver", "Run Server", "play_arrow"],
          ["migrate", "Migrate"],
          ["makemigrations", "Make Migrations"],
          ["shell", "Shell"],
          ["other", "Enter Command", "edit"]
        ];

        let command = await select("Select Django Command", commands);

        if (!command) {
          return;
        } else if (command == "other") {
          command = await acode.prompt("Enter command");
        }

        return await execute(
          await self.#generateCommand(
            `cd "${folderUrl}"; python manage.py ${command}`,
            file,
            false
          )
        );
      }
    });

    // Override the default run function
    acodeCommands["run"] = () => this.run();
    acodeCommands["run-file"] = () => this.run(true);

    this.$func = this.checkRunnable.bind(this);
    EditorFile.oncanrun = this.$func;

    editorManager.editor.commands.addCommand({
      name: "coderunner:run",
      description: "Run Project",
      bindKey: {
        win: "Ctrl-Shift-R"
      },
      exec: () => this.run(false)
    });

    editorManager.editor.commands.addCommand({
      name: "coderunner:run_file",
      description: "Run File",
      bindKey: {
        win: "Ctrl-R"
      },
      exec: () => this.run(true)
    });

    editorManager.editor.commands.addCommand({
      name: "coderunner:stop_run",
      description: "Stop Run",
      bindKey: {
        win: "Ctrl-Alt-R"
      },
      exec: () => this.$controller?.abort()
    });

    // editorManager.editor.commands.addCommand({
    //   name: "coderunner:default",
    //   description: "Set Default",
    //   bindKey: {
    //     win: "Ctrl-Shift",
    //   },
    //   exec: () => this.setDefault(),
    // });

    // editorManager.editor.commands.addCommand({
    //   name: "coderunner:run_handler",
    //   description: "Run Code",
    //   bindKey: {
    //     win: "Ctrl-R",
    //   },
    //   exec: (ev) => this.run(ev),
    // });

    openFolder.addOption(async function ({ path, name, isRoot, type }) {
      let optionName, exec, canRun;

      if (type === "file") {
        optionName = "Run File";
        canRun = !Array.isArray(
          await self.getHandler(
            { name, uri: path }, true, false, false
          )
        );
      } else {
        optionName = "Run Project";
        canRun = !Array.isArray(
          await self.getHandler(
            { name, uri: path }, true, true, false
          )
        );
      }

      if (!canRun) return;

      return {
        name: optionName, icon: "play_arrow",
        exec: () => self.runCode({ name, uri: path })
      };
    });
    
    const {list, cb} = this.settingsObj;
    addCustomSettings(
      {
        key: "coderunner-settings",
        text: strings["coderunner"] || "Code Runner",
        index: 1, icon: "play_arrow"
      }, settingsPage("Code Runner", list, cb)
    )

    acode.define("coderunner", {
      getDirectoryForFile,
      run: this.run.bind(this),
      stop: this.stop.bind(this),
      addHandler: this.addHandler.bind(this),
      removeHandler: this.removeHandler.bind(this)
    });
  }

  #commandsSettings() {
    const title = strings.formatter;
  
    const items = this.commands.map((item) => {
      if (item.project || !item.name) return;

      const { name, extension, command, icon } = item;

      return {
        key: name, text: `${name} (*.${extension})`,
        icon: icon || `file file_type_default file_type_${name.toLowerCase()}`,
        value: command, prompt: `Command for ${name}`, promptType: "text"
      };
    }).filter(Boolean);
  
    const page = settingsPage(title, items, callback, 'separate');
    page.show();
  
    const callback = (key, value) => {
      const target = this.commands.find(item => (item.name === name));
      if (target) (target.command = value);
      appSettings.update();
    }
  }

  get logger() {
    if (this.#logger) return this.#logger;

    let logger = acode.require("logger");
    if (logger) {
      this.#logger = logger("coderunner");
      return this.#logger;
    }
    return null;
  }

  get commands() {
    let data = this.#commands;

    if (typeof data == "string") {
      try {
        data = JSON.parse(data);
      } catch (err) {
        acode.alert("Invalid command config");
        throw err;
      }
    }

    if (!this.settings.projectsRunnable) {
      return [...data, this.#projectCommands[0]];
    }

    return [...data, ...this.#projectCommands];
  }

  async getHandler(file, single=true, projects=true, ignorable=true) {
    let extension = this.getFileExtension(file.name);
    let commands = [];

    for (let command of this.commands) {
      if (command.ignorable && (ignorable === false)) continue;
      if (command.project && (projects === false)) continue;

      if (command.extension && command.extension == extension) {
        if (single) {
          return command;
        } else {
          commands.push(command);
        }
      } else if (command.match) {
        if (typeof command.match == "function") {
          if (await command.match(file)) {
            if (single) {
              return command;
            } else {
              commands.push(command);
            }
          }
        }

        let regex = new RegExp(command.match);
        if (regex.exec(file.name)) {
          if (single) {
            return command;
          } else {
            commands.push(command);
          }
        }
      }
    }

    return commands;
  }

  ensureCd(command, dir = "$dir") {
    if (this.settings.changeDirectory) {
      return command;
    } else {
      return `cd "${dir}"; ${command}`;
    }
  }

  run(project) {
    return this.runCode(
      editorManager.activeFile, project
    );
  }

  async runCode(file, project) {
    let handler,
      cmd,
      handlers = await this.getHandler(file, false);

    let execute = async (cmd, project) => {
      if (cmd) {
        this.logger && this.logger.debug("Running: " + cmd);

        try {
          await this.execute(cmd);

          this.logger && this.logger.debug("Done. Exited with code=0");
        } catch (err) {
          this.logger &&
            this.logger.error(`Failed to run "${file.name}": ${String(err)}`);
          throw err;
        }
      }
    };

    let setDefault;
    if (!project && (setDefault = handlers.find(h => h.default))) {
      handler = setDefault;
    } else if (
      handlers.length > 1 ||
      (handlers.length == 1 && handlers[0].project)
    ) {
      handlers.push({
        name: "Configure Default",
        icon: "settings",
        project: true,
        handler: async () => {
          let newHandlers = handlers.filter(handler => !!!handler.project);
          newHandlers.push({
            name: "Remove Default",
            icon: "settings"
          });
          let default_handler = await select(
            "Select Default",
            newHandlers.map((item, index) => {
              let icon = item.extension
                ? helpers.getIconForFile("file." + item.extension)
                : "play_arrow";
              return [
                item,
                (item.name || item.extension) +
                  (item.default ? " (Default)" : ""),
                item.icon ? item.icon : icon
              ];
            })
          );

          if (default_handler) {
            newHandlers.map(item => {
              if (item.default) {
                item.default = false;
              }
            });
            default_handler.default = true;
            await fs(this.#commandsUrl).writeFile(
              JSON.stringify(this.#commands),
              "utf-8"
            );
          }
        }
      });

      let value = await select(
        "Run Using",
        handlers.map((item, index) => {
          let icon = item.extension
            ? helpers.getIconForFile("file." + item.extension)
            : "play_arrow";
          return [
            index,
            (item.name || item.extension) + (item.default ? " (Default)" : ""),
            item.icon ? item.icon : icon
          ];
        })
      );

      if (value === undefined) {
        return;
      } else {
        handler = handlers[value];
      }
    } else if (handlers.length == 1) {
      handler = handlers[0];
    } else {
      return;
    }

    if ((cmd = handler.command)) {
      if (this.settings.commandEdit) {
        cmd = await this.#generateCommand(cmd, file);
      } else {
        cmd = this.formatCommand(cmd, file);
      }

      cmd && (await execute(cmd, project));
    } else if (handler.handler) {
      await handler.handler(file, { project, execute });
    }
  }

  async #generateCommand(command, file, changeDir) {
    let self = this;

    changeDir =
      changeDir !== undefined ? changeDir : this.settings.changeDirectory;

    let origCommand = command;
    if (changeDir) {
      command = 'cd "$dir" && ' + command;
    }

    function renderCommand() {
      let cmdSrc = app.get("#sourceCmd");
      let cmd = cmdSrc.value;

      if (cmd) {
        cmd = cmd.trim();

        let elem = app.get("#handler");
        let cd = app.get("#changeDir")?.checked;

        if (cd) {
          if (cmd.startsWith('cd "$dir" && ')) return;

          elem.setAttribute(
            "value",
            (elem.value = self.formatCommand('cd "$dir" && ' + cmd, file))
          );
        } else {
          elem.setAttribute(
            "value",
            (elem.value = self.formatCommand(
              (cmdSrc.value = cmd.replace('cd "$dir" && ', "")),
              file
            ))
          );
        }
      }
    }

    let prompts = await multiPrompt("Run Code", [
      {
        id: "sourceCmd",
        value: command,
        onchange: renderCommand
      },
      {
        id: "handler",
        placeholder: "Handler",
        value: this.formatCommand(command, file)
      },
      [
        {
          id: "changeDir",
          type: "checkbox",
          placeholder: "Change Directory",
          onchange: renderCommand,
          value: changeDir
        }
      ]
    ]);
    return prompts.handler;
  }

  stop() {
    // this.$stopBtn.remove();
    this.execute("^C");
    this.logger && this.logger.debug("Done. Exited with code=1");
  }

  async execute(command, runLibrary) {
    let acodex = acode.require("acodex"),
      terminal;
    this.$controller = new AbortController();
    const signal = this.$controller.signal;
    runLibrary = runLibrary || this.settings.runLibrary;

    if (runLibrary === "acodex" && acodex) {
      await runAcodeX(acodex, command, signal);
    } else {
      if (runLibrary === "acode") {
        await runAcodePty(splitCommand(command), signal, this.$page);
      } else {
        await runAcodeTerminal(acode.require("terminal"), signal, command);
      }
    }
  }

  destroy() {
    editorManager.editor.commands.removeCommand("coderunner:run_code");
  }

  checkRunnable(event) {
    event.preventDefault();

    const file = event.target;
    const self = this;

    file.writeCanRun(async function () {
      let handlers = await self.getHandler(file);
      return !Array.isArray(handlers);
    });
  }

  async checkProjectRunnable(file) {}

  getFileExtension(name) {
    return String(name).split(".").at(-1);
    // return Url.extname(name)
  }

  formatCommand(cmd, file, contextMenu) {
    if (cmd) {
      let splits = file.name.split(".");
      splits.pop();
      let fileNameNoExt = splits.join(".");
      let uri = getUrl(file.uri);

      let paths = uri.split("/");
      paths.pop();
      let dir = paths.join("/") + "/";

      let folder = getDirectoryForFile(file);

      cmd = cmd
        .replaceAll("$nameNoExt", fileNameNoExt)
        .replaceAll("$dirNoSlash", dir.slice(0, dir.length - 1))
        .replaceAll("$workspaceUrl", folder?.url)
        .replaceAll("$name", file.name)
        .replaceAll("$dir", dir)
        .replaceAll("$uri", uri);
      return cmd;
    }
  }

  addHandler(config) {
    this.#projectCommands.push(config);
  }

  removeHandler(name) {
    this.#projectCommands = this.#projectCommands.filter(item => {
      return item.name === name;
    });
  }

  initialSettings() {
    return {
      commandEdit: true,
      runLibrary: "terminal",
      replaceRunBtn: true,
      changeDirectory: true,
      projectsRunnable: true
    };
  }

  get settingsObj() {
    let settings = this.settings;
    let commands = settings.commands || this.#commands;
    return {
      list: [
        {
          index: 0,
          key: "commands",
          text: "Commands"
        },
        {
          index: 1,
          key: "changeDirectory",
          text: "Change Directory",
          info: "Change the current directory before running.",
          checkbox: !!settings.changeDirectory
        },
        {
          index: 1,
          key: "runLibrary",
          text: "Terminal Library",
          value: "AcodeX",
          info: "Acode library to use to execute commands.",
          select: ["acode", "acodex", "acode terminal"]
        },
        {
          index: 3,
          key: "replaceRunBtn",
          text: "Replace Run Button",
          info: "Replace the default run button",
          checkbox: !!settings.replaceRunBtn
        },
        {
          index: 4,
          key: "projectsRunnable",
          text: "Run Projects",
          info: "Display option to run projects.",
          checkbox: !!settings.projectsRunnable
        },
        {
          index: 5,
          key: "commandEdit",
          text: "Enable Command Edit Box",
          info: "Whether to display prompt to edit command before running.",
          checkbox: !!settings.commandEdit
        }
      ],
      cb: (key, value) => {
        if (key === "commands")
          return this.#commandsSettings();
        this.settings[key] = value;
        appSettings.update();
      }
    };
  }

  get settings() {
    let value = appSettings.value["coderunner"];
    if (!value) {
      value = appSettings.value["coderunner"] = this.initialSettings();
      appSettings.update();
    }
    return value;
  }
}

export const runner = new CodeRunner();
export default runner;
