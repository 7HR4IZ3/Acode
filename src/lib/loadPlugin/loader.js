import Url from "utils/Url";
import fs from "fileSystem/wrapper";

export default class LoaderJS extends EventTarget {
  #cache;
  #config;
  #sources;

  #mainFile;
  #parentFile;
  #originalFile;
  #currentFile;

  #importMap;
  #bundle;

  #defaultConfig = {
    transformer: "babel",
    transpilers: {
      html$(source, filename) {
        return source;
      },
      "^.css$"(source, filename) {
        return source;
      },
      "(jsx|js|mjs|tsx|ts)$"(source, filename, config) {
        return this.transform(filename, source, config);
      },
      async vue$(source, filename, config) {
        let loader = await this.import("vue-loader");
        let parsed = loader.parse(source, { filename });
      }
    },
    processors: {
      async vue$(filename, extension, getSource) {
        let output = {
          default: {},
          __esModule: true
        };
        let source = await getSource();

        let element = document.createElement("div");
        let div = document.createElement("div");
        element.innerHTML = source;

        for (let child of element.children) {
          let lang = child.getAttribute("lang");
          let html = child.innerHTML;

          switch (child.localName) {
            case "template":
              div.innerHTML = await this.transpile(
                lang || "html",
                filename,
                html
              );
              break;
            case "style":
              let style = document.createElement("style");
              style.innerHTML = await this.transpile(
                lang || "css",
                filename,
                html
              );
              document.head.appendChild(style);
              break;
            case "script":
              source = await this.transpile(lang || "js", filename, html);
              if (child.hasAttribute("setup")) {
              } else {
                output = await this.evaluate(filename, source, output);
              }
              break;
          }
        }

        if (typeof output.default == "function") {
          output.default = {
            setup: output.default,
            name: output.default.name
          };
        }

        output.default.template =
          div.children.length <= 1 ? div.innerHTML : div.outerHTML;

        return output;
      },

      "(jsx|js|mjs|tsx|ts)$": async function (filename, extension, getSource) {
        if (extension.indexOf("mjs") !== -1) {
          extension = extension.replace("mjs", "js");
        }

        if (this.getConfig("tryNativeImport") && extension.endsWith("js")) {
          try {
            let module = await import(filename);
            return module;
          } catch (err) {
            // console.log(err);
          }
        }

        let source = await getSource(extension);
        return await this.evaluate(filename, source);
      },
      async json$(filename, extension, getSource) {
        let source = await getSource();
        return JSON.parse(source);
      }
    },
    map: {},
    paths: {},
    babel: {},
    esbuild: {},
    tsconfig: {
      ".*": {
        module: "amd"
      }
    },
    jsxConfig: {
      jsx: "react",
      jsxFactory: "React.createElement",
      jsxFragmentFactory: "React.Fragment"
    },
    baseUrl: "/",
    pathSeperator: ":",
    cacheCompiled: false,
    tryNativeImport: true,
    defaultExtension: true,
    includeSourceMap: true,
    tryExtensions: true,
    possibleExtensions: [
      '.js', '.jsx', '.es6',
      '.es', '.mjs', '.cjs'
    ],
    noCacheQuery: "noCache",
    cacheKey: "loaderjsCache",
    selector: 'script[type="loaderjs"]',

    callbacks: {
      fetchInit() {
        return {
          cache: "default"
        };
      }
    }
  };

  constructor(config, evaluateScripts = true) {
    super();

    this.#cache = new Map();
    this.#sources = new Map();

    this.#importMap = {};

    if (config && typeof config === "object") {
      this.#config = this.#deepMerge(this.#defaultConfig, config);
    } else {
      this.#config = {
        ...this.#defaultConfig
      };
    }

    if (this.#shouldCache) {
      this.$$awaitable = this.loadCompiled();
    } else {
      this.$$awaitable = this.saveCompiled();
    }

    evaluateScripts &&
      document.addEventListener(
        "DOMContentLoaded",
        this.evaluateScripts.bind(this)
      );
  }

  setConfig(config, overwrite = false) {
    let oldConfig = overwrite ? this.#defaultConfig : this.#config;

    if (config && typeof config === "object") {
      this.#config = this.#deepMerge(oldConfig, config);
    } else {
      this.#config = { ...oldConfig };
    }
  }

  get cache() {
    return this.#cache;
  }

  get sources() {
    return this.#sources;
  }

  get importMap() {
    return this.#importMap;
  }

  get bundle() {
    let ret = this.#bundle;
    return ret;
  }

  async import(name, parentFile, resolve = false, originalFile = null) {
    let mapItem, extension, idx, filename, cwd, value, processor;

    this.#parentFile = parentFile;
    this.#originalFile = originalFile;

    if (this.$$awaitable) {
      await this.$$awaitable;
      this.$$awaitable = null;
    }

    name = this.#formatName(name);

    if (this.#config.callbacks.formatName) {
      name = this.#config.callbacks.formatName(name);
    }

    if ((mapItem = this.#config.map[name])) {
      if (typeof mapItem == "string") {
        let oldCurrentFile = this.#originalFile;
        this.#originalFile = name;
        let ret = await this.import(mapItem, parentFile, resolve, name);
        this.#originalFile = oldCurrentFile;
        return ret;
      } else {
        if (!(typeof mapItem === "function")) {
          value = mapItem;
        }
        value = await mapItem();
        if (resolve && value) {
          if (!value.__esModule) {
            value = {
              default: value,
              __esModule: true
            };
          }
        }
        return value;
      }
    }

    // filename = name.trim("/").split("/").at(-1);
    filename = Url.extname(name);

    if ((idx = filename.indexOf(".")) === -1) {
      if (parentFile && this.#config.defaultExtension === true) {
        extension = parentFile.split(".").at(-1);
      } else {
        extension = this.getDefaultExtension();
      }
      if (extension && extension !== true) {
        name = name + "." + extension;
      }
    } else {
      extension = filename.substr(idx + 1);
    }

    if (!this.#mainFile) {
      this.#mainFile = name;
    }

    !originalFile && (this.#currentFile = name);
    value = this.#cache.get(name);

    if (value) {
      return value;
    }

    processor = this.getProcessor(extension);

    if (!processor) {
      extension = this.getDefaultExtension();
      processor = this.getProcessor(extension);
      if (processor) {
        name = name + "." + extension;
      } else {
        throw new Error(`No handler for: '${name}' was found.`);
      }
    }

    value = await processor(name, extension, (transpile, ...args) => {
      if (typeof transpile == "boolean") {
        transpile = this.getTranspiler(extension);
      }
      return this.getSource(name, transpile, ...args);
    });

    this.#cache.set(name, value);
    return value;
  }

  getDefaultExtension() {
    let extension;

    if (this.#parentFile && this.#config.defaultExtension === true) {
      extension = this.#parentFile.split(".").at(-1);
    } else {
      extension = this.#config.defaultExtension;
    }
    return extension;
  }

  async getSource(name, transpiler, ...args) {
    let source = this.#sources.get(name);
    if (source) return source;

    (this.#shouldCache && this.$$cacheTimeout) &&
      clearTimeout(this.$$cacheTimeout);

    source = await this.fetch(name);

    if (transpiler) {
      if (typeof transpiler == "string") {
        transpiler = this.getTranspiler(transpiler);
      }
      source = await transpiler(source, name, ...args);
    }
    this.#sources.set(name, source);

    if (this.#shouldCache) {
      this.$$cacheTimeout = setTimeout(() => {
        this.$$awaitable = this.saveCompiled();
      }, 3000);
    }

    return source;
  }

  // async fetch(url, inTry = false) {
  //   let response = await fetch(url, this.#config.callbacks.fetchInit?.() || {});

  //   if (response.ok) {
  //     return await response.text();
  //   } else {
  //     let err = new Error(
  //       `'${url}' ${response.status} : ${response.statusText}`
  //     );

  //     if (!inTry && this.#config.tryExtensions == true) {
  //       for (let extension of this.getPossibleExtensions()) {
  //         try {
  //           url =
  //             url.slice(0, url.lastIndexOf("." + this.getDefaultExtension())) +
  //             extension;
  //           let ret = await this.fetch(url, true);
  //           this.#originalFile = url;
  //           return ret;
  //         } catch {}
  //       }
  //     }
  //     throw err;
  //   }
  // }

  async fetch(rawUrl, inTry = false) {
    let url = rawUrl;
    let sourceText, cbs = this.#config.callbacks;
    let currentExtension = Url.extname(url);
    if (!currentExtension) {}

    if (/^https?:/.test(url)) {
      // Reroute http url to fetch api
      try {
        let response = await fetch(
          url, cbs.fetchOptions?.() || {}
        );
        if (response?.ok) {
          sourceText = await response.text();
        }
      } catch {}
    } else {
      // Check if file exists
      let exists = await fs.exists(url);
      if (exists) {
        sourceText = await fs.readFile(url, { encoding: "utf-8" });
      }
    }

    if (sourceText) return sourceText;

    // Only execute if not in try (in recursion) or disabled in config
    if (!inTry && this.#config.tryExtensions === true) {
      for (let extension of this.getPossibleExtensions()) {
        try {
          // Handle extension less imports like "utils/url"
          if (!currentExtension) {
            // Check for extensions like "/index.js"
            if (extension.startsWith("/")) {
              url = Url.join(url, extension);
            } else {
              if (extension.startsWith(".")) {
                extension = extension.slice(1);
              }
              url = url + "." + extension;
            }
          } else {
            // TODO: Remove this, if the extension was specified then it
            // shouldn't be tried for other extensions.

            // Replace current extension with possible extension
            url = url.splice(0, url.lastIndexOf(currentExtension))
              .splice(0, -1) + extension;

            /* break; */
          }

          sourceText = await this.fetch(url, true);
          this.#originalFile = url;
          return sourceText;
        } catch (err) { console.error(err) }
      }
    }
    throw new Error(`Cannot fetch source for '${url}'`);
  }

  getProcessor(extension) {
    return this.getConfigFunction("processors", extension);
  }

  getTranspiler(extension) {
    return this.getConfigFunction("transpilers", extension);
  }

  getPossibleExtensions() {
    return [
      this.getDefaultExtension(),
      ...this.#config.possibleExtensions,
    ];
  }

  transpile(transplier, filename, source) {
    let transpiler = this.getTranspiler(transplier);
    return transpiler(source, filename);
  }

  transform(filename, source, config) {
    let transformer = this.#config.transformer || "babel";

    switch (transformer) {
      case "babel":
        transformer = LoaderJS.babelTransform;
        break;
      case "typescript":
        transformer = LoaderJS.tsTransform;
        break;
      case "esbuild":
        transformer = LoaderJS.esbuildTransform;
        break;
      case "esbuild-build":
        transformer = LoaderJS.esbuildBuildTransform;
        break;
    }

    if (typeof transformer === "function") {
      return transformer(this, filename, source, config);
    }

    throw new Error("Invalid transformer option.");
  }

  static async babelTransform(loader, filename, source, config = {}) {
    // let babel = await loader.import("babel");
    let {transform} = await import("babel");
    let extension = loader.getExtension(filename);

    config = {
      ...config,
      filename, presets: config.presets || [],
      plugins: [
        ...(config.plugins || []),
        "transform-modules-amd",
        "syntax-import-meta"
        // "proposal-dynamic-import"
      ],
      minified: true,
      cwd: filename.substr(0, filename.lastIndexOf("/") + 1),
      sourceMaps: loader.getConfig("includeSourceMap") ? "inline" : undefined,
      ...((await loader.getConfigFunction("babel", extension)) || {})
    };

    switch (extension) {
      case "ts":
        (config.presets ??= []).push("typescript");
        (config.plugins ??= []).push([
          "transform-typescript",
          {
            isTSX: true,
            allExtensions: true,
            pragma: cfg.jsxFactory,
            pragmaFrag: cfg.jsxFragmentFactory
          }
        ]);
        config.plugins.push("proposal-decorators");
        break;
      case "tsx":
        break;
      case "js":
        break;
      case "jsx":
        let cfg = loader.getConfig("jsxConfig");
        (config.plugins ??= []).push([
          "transform-react-jsx",
          {
            pragma: cfg.jsxFactory,
            pragmaFrag: cfg.jsxFragmentFactory
          }
        ]);
        config.plugins.push("syntax-jsx");
        break;
    }

    let transformed = babel.transform(source, config);
    return transformed.code;
  }

  static EsbuildPlugin(loader) {
    return {
      name: "loaderjs",
      setup(build) {
        // Intercept all paths
        build.onResolve({ filter: /.*/ }, async args => {
          console.log(args);
          return {
            contents: await loader.getSource(args.path),
            external: true
          };
        });
      }
    };
  }

  static async esbuildBuildTransform(loader, filename, source, config = {}) {
    let esbuild = await loader.import("esbuild");
    let extension = loader.getExtension(filename);

    config = {
      format: "cjs",
      ...config,
      ...((await loader.getConfigFunction("esbuild", extension)) || {})
    };

    let result = await esbuild.build({
      stdin: {
        contents: source,

        // These are all optional:
        resolveDir: loader.getConfig("baseUrl") || "/",
        sourcefile: filename
      },
      // format: "cjs",
      bundle: true,
      write: false,
      plugins: [LoaderJS.EsbuildPlugin(this, filename)],
      ...config
    });
    for (let out of result.outputFiles) {
      console.log(out.path, out.contents, out.hash, out.text);
    }
    // throw new Error("Hii");
    return result.outputFiles[0].text;
  }

  static async esbuildTransform(loader, filename, source, config = {}) {
    let esbuild = await loader.import("esbuild");
    let extension = loader.getExtension(filename);

    config = {
      format: "cjs",
      ...config,
      ...((await loader.getConfigFunction("esbuild", extension)) || {})
    };

    switch (extension) {
      case "js":
        break;
      case "ts":
        break;
      case "jsx":
      case "tsx":
        let cfg = loader.getConfig("jsxConfig");
        config.jsx ??= "react";
        config = { ...config, ...cfg };
        break;
    }

    let transformed = await esbuild.transform(source, {
      minify: true,
      sourcefile: filename,
      sourcemap: loader.getConfig("includeSourceMap") ? "inline" : undefined,
      ...config
    });
    return transformed.code;
  }

  static async tsTransform(loader, filename, source, config = {}) {
    let ts = await loader.import("typescript");
    let extension = loader.getExtension(filename);

    config = {
      inlineSourceMap: loader.getConfig("includeSourceMap"),

      ...config,
      ...((await loader.getConfigFunction("tsconfig", extension)) || {})
    };

    let code = ts.transpile(source, config, filename);

    if (code.indexOf('require("') !== -1) {
      code = code
        .replace("(function (require", "(async function (require")
        .replaceAll('require("', 'await require("');
    }
    return code;
  }

  evaluate(__dirname, $$code, exports) {
    let $$__defines_module = false;
    return new Promise(async resolve => {
      let module = {},
        require,
        $import,
        __filename = Url.basename(__dirname);

      module.exports = exports = exports || {};

      let $$$addDependency = origName => {
        let name = origName;
        let target = this.#originalFile || __dirname;
        if (!this.#importMap[target]) {
          this.#importMap[target] = new Set();
        }

        if (target && name.startsWith(".") && name.length > 2) {
          let cwd = target.substr(0, target.lastIndexOf("/") + 1);
          name = new URL(cwd + name, location.href).pathname;
        }

        this.#importMap[target].add([origName, name]);
        return name;
      };

      require = $import = name => {
        name = $$$addDependency(name);
        return this.import(name, __dirname, true);
      };
      require.resolve = module => {
        this.resolve()
      }

      let define = async (imports, factory) => {
        $$__defines_module = true;
        let dependencies = [];
        for (let item of imports.map($$$addDependency)) {
          dependencies.push(
            item == "exports"
              ? module.exports
              : item == "require"
                ? require
                : await this.import(item, __dirname, true)
          );
        }

        await factory(...dependencies);
        resolve(module.exports);
      };
      define.amd = true;

      let ctx = this.getEvaluateContext(window, $$code);
      let result = await ctx(
        __dirname, __filename,
        require, define
      );
      (!$$__defines_module) && resolve(result);
    });
  }
  
  getEvaluateContext(context, $$code) {
    // Evaluate in isoated context
    return (function(
      __dirname, __filename, require, define
    ) {
      return eval($$code);
    }).bind(context || window);
  }

  async saveCompiled() {
    const cacheStorage = await caches.open(
      "__loaderJS__" + this.#config.cacheKey
    );

    if (this.#sources.size == 0) {
      for (let key of await cacheStorage.keys()) {
        await cacheStorage.delete(key);
      }
    }

    for (let [key, value] of this.#sources.entries()) {
      await cacheStorage.put(key, new Response(value));
    }
  }

  async loadCompiled() {
    const cacheStorage = await caches.open(
      "__loaderJS__" + this.#config.cacheKey
    );

    for (let request of await cacheStorage.keys()) {
      let key = request.url.replace(location.origin, "");
      this.#sources.set(key, await (await cacheStorage.match(request)).text());
    }
  }

  generateBundle() {
    let compiled = [];

    let head = `
    (function(){let m;const ms = {};window.require = name => {let ret = ms[name]; if (ret) return ret.exports;return window[name]}
      window.define=(i,f,n)=>{let dependencies = [];
        n&&(m=ms[n]={ exports: {} });for(let ii of i) {dependencies.push(ii=="exports"?m.exports:ii=="module"?m:ii =="require"?require:require(ii))};f(...dependencies)};`,
      script = "";

    let cleanSource = source => {
      if (this.#config.includeSourceMap) {
        let splits = source.split("\n");
        splits.pop();
        source = splits.join("\n");
      }
      return source;
    };

    let exportTemplate = (name, source, deps) => {
      return `
/* '${name}' [${[...deps].join(", ")}]*/ (function(module,exports){
  ${source}
})((m=ms['${name}']={exports:{}}),m.exports);`;
    };

    let findClosest = name => {
      for (let item in this.#importMap) {
        if (item.indexOf(name) != -1) {
          return item;
        }
      }
      return name;
    };

    function compile([realModule, module]) {
      if (
        compiled.includes(realModule) ||
        ["require", "expors"].includes(realModule)
      )
        return;

      compiled.push(realModule);

      let sourceFile = this.#formatName(this.config.map[module] || module);

      let deps = this.#importMap[module];

      if (!deps) {
        deps = this.#importMap[(module = findClosest(module))];
      }

      // console.log(module, deps)

      if (!deps) {
        return;
      }

      deps.forEach(compile.bind(this));

      let source = this.#sources.get(sourceFile) || this.#sources.get(module);

      console.log(realModule, module);
      if (source) {
        source = cleanSource(source);
        source = exportTemplate(realModule, source, deps);
        // script = source + "\n" + script;
        script = script + "\n" + source;
      }
    }

    compile.bind(this)(findClosest(this.#mainFile));
    let ret = head + script + "})();";
    this.#bundle = ret;
    return ret;
  }

  downloadBundle(sync = true, name = "loaderjs.bundle.js") {
    let bundle = this.#bundle || (this.#bundle = this.generateBundle(sync));

    let a = document.createElement("a");
    a.setAttribute("download", name);
    a.setAttribute(
      "href",
      URL.createObjectURL(new Blob([bundle], { type: "text/plain" }))
    );

    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  getBabelConfig(filename) {
    return (
      this.getConfigFunction("babelConfig", this.getExtension(filename)) || {}
    );
  }

  getEsbuildConfig(filename) {
    return this.getConfigFunction("esbuild", this.getExtension(filename)) || {};
  }

  getTsConfig(filename) {
    return (
      this.getConfigFunction("tsConfig", this.getExtension(filename)) || {}
    );
  }

  getExtension(filename) {
    return Url.extname(filename);
  }

  #formatName(name) {
    // name = name.replace("@", this.config.baseUrl);

    if (
      typeof name !== "string" ||
      name.indexOf(this.#config.pathSeperator) == -1
    ) {
      return name;
    }

    let path = name.split(this.#config.pathSeperator, 1)[0];
    name = name.replace(
      path + this.#config.pathSeperator,
      this.#config.paths[path]
    );

    return name;
  }

  getConfig(configKey) {
    return this.#config[configKey];
  }

  getConfigFunction(configKey, extension) {
    for (let key in this.#config[configKey] || {}) {
      if (
        extension === key ||
        RegExp(key.replaceAll(".*", "*").replaceAll("*", ".*")).exec(extension)
      ) {
        let func = this.#config[configKey][key];
        return typeof func == "function" ? func.bind(this) : func;
      }
    }
  }

  get #shouldCache() {
    return (
      location.search.indexOf(this.#config.noCacheQuery) === -1 &&
      this.#config.cacheCompiled === true
    );
  }

  #deepMerge(obj1, obj2) {
    const merged = {
      ...obj1,
      ...obj2
    };

    // Loop through the properties of the merged object
    for (const key of Object.keys(merged)) {
      let val1 = obj1[key];
      let val2 = obj2[key];

      // Check if the property is an object
      if (Array.isArray(val1) && Array.isArray(val2)) {
        merged[key] = [...val1, ...val2];
      } else if (
        typeof val1 === "object" &&
        val1 !== null &&
        typeof val2 === "object" &&
        val2 !== null
      ) {
        // If the property is an object, recursively merge the objects
        merged[key] = this.#deepMerge(val1, val2);
      }
    }

    return merged;
  }

  async evaluateSource(source, name, extension) {
    extension = extension || this.getExtension(name);
    let processor = this.getProcessor(extension);

    return await processor(name, extension, async (transpiler, ...args) => {
      if (typeof transpiler == "boolean") {
        transpiler = this.getTranspiler(extension);
      }
      if (transpiler) {
        if (typeof transpiler == "string") {
          transpiler = this.getTranspiler(transpiler);
        }
        source = await transpiler(source, name, ...args);
      }
      return source;
    });
  }

  async evaluateScripts() {
    for (let element of [...document.querySelectorAll(this.#config.selector)]) {
      let src = element.getAttribute("src");
      let name = element.getAttribute("name");
      let value, source, extension, processor;

      if (src) {
        value = await this.import(src);
      } else {
        source = element.innerHTML;

        if (name) {
          extension = this.getExtension(name);
        } else {
          extension = element.getAttribute("lang") || "js";
        }

        name = name || `script${Math.random() * 9}.${extension}`;

        value = await this.evaluateSource(source, name, extension);
      }

      name && this.#cache.set(name, value);
    }
  }
}
