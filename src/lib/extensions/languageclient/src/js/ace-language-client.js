"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AceLanguageClient = void 0;
const language_provider_1 = require("./language-provider");
const service_manager_1 = require("./services/service-manager");
const mock_worker_1 = require("./misc/mock-worker");
let serviceManager, client;
class AceLanguageClient {
    /**
     *  Creates LanguageProvider for any Language Server to connect with JSON-RPC (webworker, websocket)
     * @param {LanguageClientConfig | LanguageClientConfig[]} servers
     * @param {ProviderOptions} options
     */
    static for(servers, options) {
        if (!serviceManager) {
            client = new mock_worker_1.MockWorker(true);
            let ctx = new mock_worker_1.MockWorker(true);
            client.setEmitter(ctx);
            ctx.setEmitter(client);
            serviceManager = new service_manager_1.ServiceManager(ctx);
        }
        if (servers instanceof Array) {
            servers.forEach((serverData, index) => {
                serviceManager.registerServer("server" + index, serverData);
            });
        }
        else {
            serviceManager.registerServer("server", servers);
        }
        return language_provider_1.LanguageProvider.create(client, options);
    }
}
exports.AceLanguageClient = AceLanguageClient;
//# sourceMappingURL=ace-language-client.js.map