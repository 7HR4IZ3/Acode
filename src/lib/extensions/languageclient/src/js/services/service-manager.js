"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceManager = void 0;
const utils_1 = require("../utils");
const message_types_1 = require("../message-types");
class ServiceManager {
    constructor(ctx) {
        this.$services = {};
        this.serviceInitPromises = {};
        this.$sessionIDToMode = {};
        this.ctx = ctx;
        let doValidation = async (document, servicesInstances) => {
            var _a;
            servicesInstances !== null && servicesInstances !== void 0 ? servicesInstances : (servicesInstances = this.getServicesInstances(document.uri));
            if (servicesInstances.length === 0) {
                return;
            }
            //this is list of documents linked to services
            let sessionIDList = Object.keys(servicesInstances[0].documents);
            servicesInstances = this.filterByFeature(servicesInstances, "diagnostics");
            servicesInstances = servicesInstances.filter(el => {
                return el.serviceCapabilities.diagnosticProvider;
            });
            if (servicesInstances.length === 0) {
                return;
            }
            let postMessage = {
                type: message_types_1.MessageType.validate
            };
            for (let sessionID of sessionIDList) {
                let diagnostics = (_a = (await Promise.all(servicesInstances.map(el => {
                    return el.doValidation({ uri: sessionID });
                })))) !== null && _a !== void 0 ? _a : [];
                postMessage["sessionId"] = sessionID;
                postMessage["value"] = diagnostics.flat();
                ctx.postMessage(postMessage);
            }
        };
        let provideValidationForServiceInstance = async (serviceName) => {
            let service = this.$services[serviceName];
            if (!service)
                return;
            var serviceInstance = service.serviceInstance;
            if (serviceInstance)
                await doValidation(undefined, [serviceInstance]);
        };
        ctx.addEventListener("message", async (ev) => {
            var _a, _b, _c, _d;
            let message = ev.data;
            let sessionID = (_a = message.sessionId) !== null && _a !== void 0 ? _a : "";
            let version = message.version;
            let postMessage = {
                type: message.type,
                sessionId: sessionID
            };
            let serviceInstances = this.getServicesInstances(sessionID);
            let documentIdentifier = {
                uri: sessionID,
                version: version
            };
            switch (message["type"]) {
                case message_types_1.MessageType.format:
                    serviceInstances = this.filterByFeature(serviceInstances, "format");
                    if (serviceInstances.length > 0) {
                        //we will use only first service to format
                        postMessage["value"] = await serviceInstances[0].format(documentIdentifier, message.value, message.format);
                    }
                    break;
                case message_types_1.MessageType.complete:
                    postMessage["value"] = (await Promise.all(this.filterByFeature(serviceInstances, "completion").map(async (service) => {
                        return {
                            completions: await service.doComplete(documentIdentifier, message.value),
                            service: service.serviceData.className
                        };
                    }))).filter(utils_1.notEmpty);
                    break;
                case message_types_1.MessageType.resolveCompletion:
                    let serviceName = message.value.service;
                    postMessage["value"] = await ((_b = this.filterByFeature(serviceInstances, "completionResolve")
                        .find(service => {
                        if (service.serviceData.className === serviceName) {
                            return service;
                        }
                    })) === null || _b === void 0 ? void 0 : _b.doResolve(message.value));
                    break;
                case message_types_1.MessageType.change:
                    serviceInstances.forEach(service => {
                        service.setValue(documentIdentifier, message.value);
                    });
                    await doValidation(documentIdentifier, serviceInstances);
                    break;
                case message_types_1.MessageType.applyDelta:
                    serviceInstances.forEach(service => {
                        service.applyDeltas(documentIdentifier, message.value);
                    });
                    await doValidation(documentIdentifier, serviceInstances);
                    break;
                case message_types_1.MessageType.hover:
                    postMessage["value"] = (await Promise.all(this.filterByFeature(serviceInstances, "hover").map(async (service) => {
                        return service.doHover(documentIdentifier, message.value);
                    }))).filter(utils_1.notEmpty);
                    break;
                case message_types_1.MessageType.validate:
                    postMessage["value"] = await doValidation(documentIdentifier, serviceInstances);
                    break;
                case message_types_1.MessageType.init: //this should be first message
                    postMessage["value"] = (_c = (await this.addDocument(documentIdentifier, message.value, message.mode, message.options))) === null || _c === void 0 ? void 0 : _c.map(el => el.serviceCapabilities);
                    await doValidation(documentIdentifier);
                    break;
                case message_types_1.MessageType.changeMode:
                    postMessage["value"] = (_d = (await this.changeDocumentMode(documentIdentifier, message.value, message.mode, message.options))) === null || _d === void 0 ? void 0 : _d.map(el => el.serviceCapabilities);
                    await doValidation(documentIdentifier, serviceInstances);
                    break;
                case message_types_1.MessageType.changeOptions:
                    serviceInstances.forEach(service => {
                        service.setOptions(sessionID, message.options);
                    });
                    await doValidation(documentIdentifier, serviceInstances);
                    break;
                case message_types_1.MessageType.dispose:
                    this.removeDocument(documentIdentifier);
                    await doValidation(documentIdentifier, serviceInstances);
                    break;
                case message_types_1.MessageType.globalOptions:
                    this.setGlobalOptions(message.serviceName, message.options, message.merge);
                    await provideValidationForServiceInstance(message.serviceName);
                    break;
                case message_types_1.MessageType.configureFeatures:
                    this.configureFeatures(message.serviceName, message.options);
                    await provideValidationForServiceInstance(message.serviceName);
                    break;
                case message_types_1.MessageType.signatureHelp:
                    postMessage["value"] = (await Promise.all(this.filterByFeature(serviceInstances, "signatureHelp").map(async (service) => {
                        return service.provideSignatureHelp(documentIdentifier, message.value);
                    }))).filter(utils_1.notEmpty);
                    break;
                case message_types_1.MessageType.documentHighlight:
                    let highlights = (await Promise.all(this.filterByFeature(serviceInstances, "documentHighlight").map(async (service) => {
                        return service.findDocumentHighlights(documentIdentifier, message.value);
                    }))).filter(utils_1.notEmpty);
                    postMessage["value"] = highlights.flat();
                    break;
            }
            ctx.postMessage(postMessage);
        });
    }
    static async $initServiceInstance(service, ctx) {
        var _a, _b;
        let module;
        if (service.type) {
            if (["socket", "webworker"].includes(service.type)) {
                //TODO: all types
                module = await service.module();
                service.serviceInstance = new module["LanguageClient"](service, ctx);
            }
            else
                throw "Unknown service type";
        }
        else {
            if (service.className) {
                module = await service.module();
                service.serviceInstance = new module[service.className](service.modes);
            }
            else {
                throw new Error("Please specify a 'className' option.");
            }
        }
        if (service.options || service.initializationOptions) {
            service.serviceInstance.setGlobalOptions((_b = (_a = service.options) !== null && _a !== void 0 ? _a : service.initializationOptions) !== null && _b !== void 0 ? _b : {});
        }
        service.serviceInstance.serviceData = service;
        return service.serviceInstance;
    }
    async $getServicesInstancesByMode(mode) {
        let services = this.findServicesByMode(mode);
        if (services.length === 0) {
            return [];
        }
        return Promise.all(services.map(service => this.initializeService(service)));
    }
    async initializeService(service) {
        if (!service.serviceInstance) {
            if (!this.serviceInitPromises[service.id]) {
                this.serviceInitPromises[service.id] =
                    ServiceManager.$initServiceInstance(service, this.ctx).then(instance => {
                        service.serviceInstance = instance;
                        // if (service.type == "socket" && service.socket) {
                        //   service.socket.addEventListener("reconnect", () => {
                        //     service.serviceInstance?.dispose()
                        //     this.initializeService(service);
                        //   })
                        // }
                        delete this.serviceInitPromises[service.id]; // Clean up
                        return instance;
                    });
            }
            return this.serviceInitPromises[service.id];
        }
        else {
            return service.serviceInstance;
        }
    }
    setGlobalOptions(serviceName, options, merge = false) {
        let service = this.$services[serviceName];
        if (!service)
            return;
        service.options = merge ? (0, utils_1.mergeObjects)(options, service.options) : options;
        if (service.serviceInstance) {
            service.serviceInstance.setGlobalOptions(service.options);
        }
    }
    async addDocument(documentIdentifier, documentValue, mode, options) {
        if (!mode || !/^ace\/mode\//.test(mode))
            return;
        mode = mode.replace("ace/mode/", "");
        let serviceInstances = await this.$getServicesInstancesByMode(mode);
        if (serviceInstances.length === 0)
            return;
        let documentItem = {
            uri: documentIdentifier.uri,
            version: documentIdentifier.version || 1,
            languageId: mode,
            text: documentValue
        };
        serviceInstances.forEach(el => el.addDocument(documentItem));
        this.$sessionIDToMode[documentIdentifier.uri] = mode;
        return serviceInstances;
    }
    async changeDocumentMode(documentIdentifier, value, mode, options) {
        this.removeDocument(documentIdentifier);
        return await this.addDocument(documentIdentifier, value, mode, options);
    }
    removeDocument(document) {
        let services = this.getServicesInstances(document.uri);
        if (services.length > 0) {
            services.forEach(el => el.removeDocument(document));
            delete this.$sessionIDToMode[document.uri];
        }
    }
    getServicesInstances(sessionID) {
        // console.log(sessionID, this.$sessionIDToMode);
        let mode = this.$sessionIDToMode[sessionID];
        if (!mode)
            return []; //TODO:
        let services = this.findServicesByMode(mode);
        return services
            .map(service => {
            // console.log(service)
            if (!service.serviceInstance) {
                return null;
            }
            ;
            let serviceData = service.serviceInstance.serviceData;
            // console.log(serviceData);
            if (serviceData.type == "socket" && serviceData.socket) {
                if (serviceData.socket.readyState !== WebSocket.OPEN) {
                    if (!(serviceData.socket instanceof WebSocket)) {
                        serviceData.socket.connect();
                    }
                }
            }
            return service.serviceInstance;
        })
            .filter(utils_1.notEmpty);
    }
    filterByFeature(serviceInstances, feature) {
        return serviceInstances.filter(el => {
            var _a;
            if (!el.serviceData.features[feature]) {
                return false;
            }
            const capabilities = el.serviceCapabilities;
            switch (feature) {
                case "hover":
                    return capabilities.hoverProvider == true;
                case "completion":
                    return capabilities.completionProvider != undefined;
                case "completionResolve":
                    return ((_a = capabilities.completionProvider) === null || _a === void 0 ? void 0 : _a.resolveProvider) === true;
                case "format":
                    return (capabilities.documentRangeFormattingProvider == true ||
                        capabilities.documentFormattingProvider == true);
                case "diagnostics":
                    return capabilities.diagnosticProvider != undefined;
                case "signatureHelp":
                    return capabilities.signatureHelpProvider != undefined;
                case "documentHighlight":
                    return capabilities.documentHighlightProvider == true;
            }
        });
    }
    findServicesByMode(mode) {
        return Object.values(this.$services).filter(el => {
            let extensions = el.modes.split("|");
            if (extensions.includes(mode))
                return el;
        });
    }
    registerService(name, service) {
        service.id = name;
        service.features = this.setDefaultFeaturesState(service.features);
        this.$services[name] = service;
    }
    registerServer(name, clientConfig) {
        clientConfig.id = name;
        clientConfig.className = "LanguageClient";
        clientConfig.features = this.setDefaultFeaturesState(clientConfig.features);
        this.$services[name] = clientConfig;
    }
    configureFeatures(name, features) {
        features = this.setDefaultFeaturesState(features);
        if (!this.$services[name])
            return;
        this.$services[name].features = features;
    }
    setDefaultFeaturesState(serviceFeatures) {
        var _a, _b, _c, _d, _e, _f, _g;
        let features = serviceFeatures !== null && serviceFeatures !== void 0 ? serviceFeatures : {};
        (_a = features.hover) !== null && _a !== void 0 ? _a : (features.hover = true);
        (_b = features.completion) !== null && _b !== void 0 ? _b : (features.completion = true);
        (_c = features.completionResolve) !== null && _c !== void 0 ? _c : (features.completionResolve = true);
        (_d = features.format) !== null && _d !== void 0 ? _d : (features.format = true);
        (_e = features.diagnostics) !== null && _e !== void 0 ? _e : (features.diagnostics = true);
        (_f = features.signatureHelp) !== null && _f !== void 0 ? _f : (features.signatureHelp = true);
        (_g = features.documentHighlight) !== null && _g !== void 0 ? _g : (features.documentHighlight = true);
        return features;
    }
}
exports.ServiceManager = ServiceManager;
//# sourceMappingURL=service-manager.js.map