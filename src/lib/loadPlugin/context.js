
export default class PluginContext {
  #plugin;
  permissions = {};

  constructor(pluginID, packageJSON) {
    this.#plugin = {
      id: pluginID,
      json: packageJSON
    };
  }

  hasPermission(alias) {}
}
