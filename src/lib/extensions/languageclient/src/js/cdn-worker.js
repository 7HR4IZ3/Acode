"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWorker = void 0;
function createWorkerBlob(cdnUrl, services) {
    return new Blob([`
        importScripts("${cdnUrl}/service-manager.js");
        const manager = new ServiceManager(self);

        ${services.map(service => {
            var _a;
            return `
            manager.registerService("${service.name}", {
                module: () => {
                    importScripts("${(_a = service.cdnUrl) !== null && _a !== void 0 ? _a : cdnUrl}/${service.script}");
                    return {${service.className}};
                },
                className: "${service.className}",
                modes: "${service.modes}"
            });
        `;
        }).join('\n')}
    `], { type: "application/javascript" });
}
function createWorker(source, includeLinters = true) {
    if (typeof Worker == "undefined")
        return {
            postMessage: function () {
            },
            terminate: function () {
            }
        };
    let blob;
    if (typeof source === "string") {
        const allServices = getServices(includeLinters);
        blob = createWorkerBlob(source, allServices);
    }
    else {
        const allServices = [...source.services, ...getServices(includeLinters)];
        const cdnUrl = source.serviceManagerCdn;
        blob = createWorkerBlob(cdnUrl, allServices);
    }
    var URL = window.URL || window.webkitURL;
    var blobURL = URL.createObjectURL(blob);
    // calling URL.revokeObjectURL before worker is terminated breaks it on IE Edge
    return new Worker(blobURL);
}
exports.createWorker = createWorker;
function getServices(includeLinters = true) {
    const allServices = [
        {
            name: "json",
            script: "json-service.js",
            className: "JsonService",
            modes: "json|json5",
        },
        {
            name: "html",
            script: "html-service.js",
            className: "HtmlService",
            modes: "html",
        },
        {
            name: "css",
            script: "css-service.js",
            className: "CssService",
            modes: "css",
        },
        {
            name: "less",
            script: "css-service.js",
            className: "CssService",
            modes: "less",
        },
        {
            name: "scss",
            script: "css-service.js",
            className: "CssService",
            modes: "scss",
        },
        {
            name: "typescript",
            script: "typescript-service.js",
            className: "TypescriptService",
            modes: "typescript|tsx|javascript|jsx",
        },
        {
            name: "lua",
            script: "lua-service.js",
            className: "LuaService",
            modes: "lua",
        },
        {
            name: "yaml",
            script: "yaml-service.js",
            className: "YamlService",
            modes: "yaml",
        },
        {
            name: "xml",
            script: "xml-service.js",
            className: "XmlService",
            modes: "xml",
        },
        {
            name: "php",
            script: "php-service.js",
            className: "PhpService",
            modes: "php",
        },
        {
            name: "javascript",
            script: "javascript-service.js",
            className: "JavascriptService",
            modes: "javascript",
        },
        {
            name: "python",
            script: "python-service.js",
            className: "PythonService",
            modes: "python",
        }
    ];
    if (includeLinters === true) {
        return allServices;
    }
    else if (includeLinters === false) {
        return [];
    }
    return allServices.filter(service => includeLinters[service.name]);
}
//# sourceMappingURL=cdn-worker.js.map