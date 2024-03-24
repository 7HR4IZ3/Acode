import Url from "utils/Url";
import Page from "components/page";
import helpers from "utils/helpers";
import { promises as fs, FileError } from "fileSystem/wrapper";

import actionStack from "../actionStack";
import legacyLoadPlugin from "./legacy";

async function main(plugin, justInstalled) {}

export default async function loadPlugin(pluginId, justInstalled = false) {
  // Legacy plugin loading.
  try {
    const plugin = await helpers.parseJSON(
      await fs.readFile(Url.join(PLUGIN_DIR, pluginId, "plugin.json"))
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

  // New plugin loading mechanism
  try {
    const packageJSON = await helpers.parseJSON(
      await fs.readFile(
        Url.join(PLUGIN_DIR, pluginId, "package.json")
      )
    );
    if (packageJSON) {
      await main(packageJSON, justInstalled);
    }
  } catch (err) {
    toast(`Error loading plugin ${pluginId}: ${error.message}`);
  }
}
