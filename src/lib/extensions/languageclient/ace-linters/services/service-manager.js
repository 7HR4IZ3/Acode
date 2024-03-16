import { mergeObjects, notEmpty } from "../utils";
import { MessageType } from "../message-types";
export class ServiceManager {
  $services = {};
  serviceInitPromises = {};
  $sessionIDToMode = {};
  ctx;
  constructor(ctx) {
    this.ctx = ctx;
    let doValidation = async (document, servicesInstances) => {
      servicesInstances ??= this.getServicesInstances(document.uri);
      if (servicesInstances.length === 0) {
        return;
      }
      let sessionIDList = Object.keys(servicesInstances[0].documents);
      servicesInstances = this.filterByFeature(
        servicesInstances,
        "diagnostics"
      );
      servicesInstances = servicesInstances.filter(el => {
        return el.serviceCapabilities.diagnosticProvider;
      });
      if (servicesInstances.length === 0) {
        return;
      }
      let postMessage = {
        type: MessageType.validate
      };
      for (let sessionID of sessionIDList) {
        let diagnostics =
          (await Promise.all(
            servicesInstances.map(el => {
              return el.doValidation({ uri: sessionID });
            })
          )) ?? [];
        postMessage["sessionId"] = sessionID;
        postMessage["value"] = diagnostics.flat();
        ctx.postMessage(postMessage);
      }
    };
    let provideValidationForServiceInstance = async serviceName => {
      let service = this.$services[serviceName];
      if (!service) return;
      var serviceInstance = service.serviceInstance;
      if (serviceInstance) await doValidation(undefined, [serviceInstance]);
    };
    ctx.addEventListener("message", async ev => {
      let message = ev.data;
      let sessionID = message.sessionId ?? "";
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
        case MessageType.format:
          serviceInstances = this.filterByFeature(serviceInstances, "format");
          if (serviceInstances.length > 0) {
            postMessage["value"] = await serviceInstances[0].format(
              documentIdentifier,
              message.value,
              message.format
            );
          }
          break;
        case MessageType.complete:
          postMessage["value"] = (
            await Promise.all(
              this.filterByFeature(serviceInstances, "completion").map(
                async service => {
                  return {
                    completions: await service.doComplete(
                      documentIdentifier,
                      message.value
                    ),
                    service: service.serviceData.className
                  };
                }
              )
            )
          ).filter(notEmpty);
          break;
        case MessageType.resolveCompletion:
          let serviceName = message.value.service;
          postMessage["value"] = await this.filterByFeature(
            serviceInstances,
            "completionResolve"
          )
            .find(service => {
              if (service.serviceData.className === serviceName) {
                return service;
              }
            })
            ?.doResolve(message.value);
          break;
        case MessageType.change:
          serviceInstances.forEach(service => {
            service.setValue(documentIdentifier, message.value);
          });
          await doValidation(documentIdentifier, serviceInstances);
          break;
        case MessageType.applyDelta:
          serviceInstances.forEach(service => {
            service.applyDeltas(documentIdentifier, message.value);
          });
          await doValidation(documentIdentifier, serviceInstances);
          break;
        case MessageType.hover:
          postMessage["value"] = (
            await Promise.all(
              this.filterByFeature(serviceInstances, "hover").map(
                async service => {
                  return service.doHover(documentIdentifier, message.value);
                }
              )
            )
          ).filter(notEmpty);
          break;
        case MessageType.validate:
          postMessage["value"] = await doValidation(
            documentIdentifier,
            serviceInstances
          );
          break;
        case MessageType.init:
          postMessage["value"] = (
            await this.addDocument(
              documentIdentifier,
              message.value,
              message.mode,
              message.options
            )
          )?.map(el => el.serviceCapabilities);
          await doValidation(documentIdentifier);
          break;
        case MessageType.changeMode:
          postMessage["value"] = (
            await this.changeDocumentMode(
              documentIdentifier,
              message.value,
              message.mode,
              message.options
            )
          )?.map(el => el.serviceCapabilities);
          await doValidation(documentIdentifier, serviceInstances);
          break;
        case MessageType.changeOptions:
          serviceInstances.forEach(service => {
            service.setOptions(sessionID, message.options);
          });
          await doValidation(documentIdentifier, serviceInstances);
          break;
        case MessageType.dispose:
          this.removeDocument(documentIdentifier);
          await doValidation(documentIdentifier, serviceInstances);
          break;
        case MessageType.globalOptions:
          this.setGlobalOptions(
            message.serviceName,
            message.options,
            message.merge
          );
          await provideValidationForServiceInstance(message.serviceName);
          break;
        case MessageType.configureFeatures:
          this.configureFeatures(message.serviceName, message.options);
          await provideValidationForServiceInstance(message.serviceName);
          break;
        case MessageType.signatureHelp:
          postMessage["value"] = (
            await Promise.all(
              this.filterByFeature(serviceInstances, "signatureHelp").map(
                async service => {
                  return service.provideSignatureHelp(
                    documentIdentifier,
                    message.value
                  );
                }
              )
            )
          ).filter(notEmpty);
          break;
        case MessageType.documentHighlight:
          let highlights = (
            await Promise.all(
              this.filterByFeature(serviceInstances, "documentHighlight").map(
                async service => {
                  return service.findDocumentHighlights(
                    documentIdentifier,
                    message.value
                  );
                }
              )
            )
          ).filter(notEmpty);
          postMessage["value"] = highlights.flat();
          break;
      }
      ctx.postMessage(postMessage);
    });
  }
  static async $initServiceInstance(service, ctx) {
    let module;
    if (service.type) {
      if (["socket", "webworker"].includes(service.type)) {
        module = await service.module();
        service.serviceInstance = new module["LanguageClient"](service, ctx);
      } else throw "Unknown service type";
    } else {
      if (service.className) {
        module = await service.module();
        service.serviceInstance = new module[service.className](service.modes);
      } else {
        throw new Error("Please specify a 'className' option.");
      }
    }
    if (service.options || service.initializationOptions) {
      service.serviceInstance.setGlobalOptions(
        service.options ?? service.initializationOptions ?? {}
      );
    }
    service.serviceInstance.serviceData = service;
    return service.serviceInstance;
  }
  async $getServicesInstancesByMode(mode) {
    let services = this.findServicesByMode(mode);
    if (services.length === 0) {
      return [];
    }
    return Promise.all(
      services.map(service => this.initializeService(service))
    );
  }
  async initializeService(service) {
    if (!service.serviceInstance) {
      if (!this.serviceInitPromises[service.id]) {
        this.serviceInitPromises[service.id] =
          ServiceManager.$initServiceInstance(service, this.ctx).then(
            instance => {
              service.serviceInstance = instance;
              delete this.serviceInitPromises[service.id];
              return instance;
            }
          );
      }
      return this.serviceInitPromises[service.id];
    } else {
      return service.serviceInstance;
    }
  }
  setGlobalOptions(serviceName, options, merge = false) {
    let service = this.$services[serviceName];
    if (!service) return;
    service.options = merge ? mergeObjects(options, service.options) : options;
    if (service.serviceInstance) {
      service.serviceInstance.setGlobalOptions(service.options);
    }
  }
  async addDocument(documentIdentifier, documentValue, mode, options) {
    if (!mode || !/^ace\/mode\//.test(mode)) return;
    mode = mode.replace("ace/mode/", "");
    let serviceInstances = await this.$getServicesInstancesByMode(mode);
    if (serviceInstances.length === 0) return;
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
    let mode = this.$sessionIDToMode[sessionID];
    if (!mode) return [];
    let services = this.findServicesByMode(mode);
    return services
      .map(service => {
        if (!service.serviceInstance) {
          return null;
        }
        let serviceInstance = service.serviceInstance;
        let serviceData = service.serviceInstance.serviceData;
        if (serviceData.type == "socket" && serviceData.socket) {
          if (serviceData.socket.readyState !== WebSocket.OPEN) {
            if (!(serviceData.socket instanceof WebSocket)) {
              serviceData.socket.connect();
            }
          }
        } else if (
          serviceData.type == "stdio" &&
          serviceInstance.$connection
        ) {
          if (
            serviceInstance.$connection.state() === WebSocket.CLOSED
          ) {
            serviceInstance.$connection.initialize();
          }
        }
        return service.serviceInstance;
      })
      .filter(notEmpty);
  }
  filterByFeature(serviceInstances, feature) {
    return serviceInstances.filter(el => {
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
          return capabilities.completionProvider?.resolveProvider === true;
        case "format":
          return (
            capabilities.documentRangeFormattingProvider == true ||
            capabilities.documentFormattingProvider == true
          );
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
      if (extensions.includes(mode)) return el;
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
    if (!this.$services[name]) return;
    this.$services[name].features = features;
  }
  setDefaultFeaturesState(serviceFeatures) {
    let features = serviceFeatures ?? {};
    features.hover ??= true;
    features.completion ??= true;
    features.completionResolve ??= true;
    features.format ??= true;
    features.diagnostics ??= true;
    features.signatureHelp ??= true;
    features.documentHighlight ??= true;
    return features;
  }
}
