import { LanguageProvider } from "./language-provider";
import { ServiceManager } from "./services/service-manager";
import { MockWorker } from "./misc/mock-worker";
let serviceManager, client;
export class AceLanguageClient {
    static for(servers, options) {
        if (!serviceManager) {
            client = new MockWorker(true);
            let ctx = new MockWorker(true);
            client.setEmitter(ctx);
            ctx.setEmitter(client);
            serviceManager = new ServiceManager(ctx);
        }
        if (servers instanceof Array) {
            servers.forEach((serverData, index) => {
                serviceManager.registerServer("server" + index, serverData);
            });
        }
        else {
            serviceManager.registerServer("server", servers);
        }
        return LanguageProvider.create(client, options);
    }
}
