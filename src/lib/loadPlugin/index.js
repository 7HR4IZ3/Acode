import Url from "utils/Url";
import Page from "components/page";
import helpers from "utils/helpers";
import { promises as fs, FileError } from "fileSystem/wrapper";

import actionStack from "../actionStack";
import legacyLoadPlugin from "./legacy";

function main(pluginID, plugin, justInstalled) {
  let nodejs = acode.nodejs;
  return new Promise((resolve, reject) => {
    function onLoadPlugin({ error }) {
      if (error) return reject(error);
      return resolve(true);
    }

    nodejs.channel.once(`plugin:${pluginID}:status`, onLoadPlugin);
    nodejs.channel.post("acode:loadPlugin", {pluginID, plugin, justInstalled});

    if (!plugin.main) { throw new Error("No main file for plugin") }

    const mainURL = Url.join(PLUGIN_DIR, pluginID, plugin.main);
  });
}

export default async function loadPlugin(pluginId, justInstalled = false) {
  // Legacy plugin loading.
  try {
    const plugin = await helpers.parseJSON(
      await fs.readFile(
        Url.join(PLUGIN_DIR, pluginId, "plugin.json"),
        { encoding: "utf-8" }
      )
    );
    if (plugin) {
      console.warn(`Using legacy loader for plugin '${pluginId}'`);
      return await legacyLoadPlugin(pluginId, justInstalled);
    }
  } catch (err) {
    // Ignore error if caused by missing 'plugin.json' file.
    if (!(err instanceof FileError)) {
      return toast(`Error loading plugin ${pluginId}: ${error.message}`);
    }
  }

  // NodeJS plugin loading.
  try {
    const packageJSON = await helpers.parseJSON(
      await fs.readFile(
        Url.join(PLUGIN_DIR, pluginId, "package.json"),
        { encoding: "utf-8" }
      )
    );
    if (packageJSON) {
      await main(pluginId, packageJSON, justInstalled);
    }
  } catch (err) {
    toast(`Error loading plugin ${pluginId}: ${err.message}`);
  }
}
