import commands from "lib/commands";
import saveState from "lib/saveState";
import EditorFile from "lib/editorFile";
import restoreFiles from "lib/restoreFiles";
import { promises as fs } from "fileSystem/wrapper";

let Url = acode.require("Url");
let confirm = acode.require("confirm");
let toast = acode.require("toast");
let loader = acode.require("loader");
let helpers = acode.require("helpers");
let openFolder = acode.require("openFolder");
let fileBrowser = acode.require("fileBrowser");
let sidebarApps = acode.require("sidebarApps");
let appSettings = acode.require("settings");

class WorkspaceManager {
  initialize() {
    this.recentspaces = JSON.parse(
      localStorage.getItem("recentWorkspaces") || "[]"
    );

    this.origSettings = appSettings.value;
    this.$func = this.loadModeSpace.bind(this);

    editorManager.on("switch-file", this.$func);

    commands["save-workspace"] = this.saveSpace.bind(this);
    commands["new-workspace"] = this.loadEmptySpace.bind(this);
    commands["close-workspace"] = () => this.loadEmptySpace(false);
  }

  async loadEmptySpace(promptSave = true) {
    if (promptSave) {
      if (await confirm("Save current workspace?")) {
        await this.saveSpace();
      }
    }
    await this.loadSpace(null, true);
  }

  async saveSpace(spaceUrl) {
    const { files, folders } = saveState(true);
    const fileBrowserState =
      helpers.parseJSON(localStorage.fileBrowserState) || [];
    const storageList = helpers.parseJSON(localStorage.storageList) || [];

    let data = JSON.stringify({
      files,
      folders,
      storageList,
      fileBrowserState,
      settings: appSettings.value
    });

    if (!spaceUrl) {
      let spaceFile = await fileBrowser(
        "file",
        "Select file to save workspace"
      );
      spaceUrl = spaceFile.url;
    }

    let loading = loader.create("Workspace", "Saving Workspace");
    loading.show();

    try {
      await fs(spaceUrl).writeFile(data, "utf-8");

      if (!this.recentspaces.includes(spaceUrl)) {
        this.recentspaces.push(spaceUrl);
      }
      localStorage.setItem(
        "recentWorkspaces",
        JSON.stringify(this.recentspaces)
      );

      toast("Saved workspace.");
    } finally {
      loading.destroy();
    }
  }

  async loadSpace(spaceUrl, empty = false) {
    if (!empty && !spaceUrl) {
      let spaceFile = await fileBrowser("file", "Select workspace file");
      if (!spaceFile) return;
      spaceUrl = spaceFile.url;
    }

    let loading = loader.create("Workspace", "Loading Workspace");
    loading.show();

    try {
      let data = empty
        ? "{ files: [], folders: [] }"
        : await fs(spaceUrl).readFile("utf-8");

      const { folders, files, storageList, fileBrowserState, settings } =
        helpers.parseJSON(data) || {};

      while (addedFolder.length) {
        addedFolder.forEach(folder => openFolder.removeItem(folder.url));
      }

      loading.setMessage("Loading State");

      editorManager.files.forEach(file => file.remove());
      folders?.length &&
        folders.forEach(folder => {
          folder.opts.listFiles = !!folder.opts.listFiles;
          openFolder(folder.url, folder.opts);
        });

      files?.length && restoreFiles(files, true);

      loading.setMessage("Saving Folders");
      folders?.length &&
        localStorage.setItem("folders", JSON.stringify(folders));
      loading.setMessage("Saving Files");
      files?.length && localStorage.setItem("files", JSON.stringify(files));
      storageList &&
        localStorage.setItem("storageList", JSON.stringify(storageList));
      fileBrowserState &&
        localStorage.setItem(
          "fileBrowserState",
          JSON.stringify(fileBrowserState)
        );

      settings && loading.setMessage("Updating Settings");
      settings && appSettings.update(settings, false, false);

      if (!this.recentspaces.includes(spaceUrl)) {
        this.recentspaces.push(spaceUrl);
      }
      localStorage.setItem(
        "recentWorkspaces",
        JSON.stringify(this.recentspaces)
      );

      toast("Loaded workspace.");
    } finally {
      loading.destroy();
    }
  }

  loadModeSpace() {
    let { session } = editorManager.editor;
    let mode = session.$modeId.replace("ace/mode/", "");
    let modeSettings = appSettings.value[`[${mode}]`];

    // console.log(mode, modeSettings)
    if (modeSettings) {
      if (!this.revertSetting) {
        this.revertSetting = this.revert(modeSettings, appSettings.value);
      }
      // console.log(this.revertSetting);
      appSettings.update(modeSettings, false, false);
    } else {
      this.revertSetting &&
        appSettings.update(this.revertSetting, false, false);
      this.revertSetting = null;
    }
  }

  revert(modeSettings, origSettings) {
    let data = {};
    for (let key in modeSettings) {
      data[key] = origSettings[key];
    }
    return data;
  }
}

export default new WorkspaceManager();
