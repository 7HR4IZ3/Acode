
export default class PluginContext {
  #plugin;
  permissions = {};

  constructor(plugin) {
    this.#plugin = plugin;
  }

  hasPermission(alias) {}
}
