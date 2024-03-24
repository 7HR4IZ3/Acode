import esbuild from "/src/assets/js/esbuild/esm/browser.js";

window.esbuild = esbuild;

let loader = window.loader = new LoaderJS({
  paths: {
    npm: "/src/assets/js/",
    ng: "/src/assets/js/@angular/",
  },
  map: {
    "@angular/animations": "ng:animations/fesm2020/animations.mjs",
    "@angular/animations/browser": "ng:animations/fesm2020/browser.mjs",

    "@angular/common": "ng:common/fesm2020/common.mjs",
    "@angular/common/http": "ng:common/fesm2020/http.mjs",

    "@angular/compiler": "ng:compiler/fesm2020/compiler.mjs",
    "@angular/core": "ng:core/fesm2020/core.mjs",
    "@angular/flex-layout": "ng:flex-layout/fesm2020/flex-layout.mjs",
    "@angular/forms": "ng:forms/fesm2020/forms.mjs",
    "@angular/material": "ng:material/fesm2020/material.mjs",

    "@angular/platform-browser":
      "ng:platform-browser/fesm2020/platform-browser.mjs",
    "@angular/platform-browser/animations":
      "ng:platform-browser/fesm2020/animations.mjs",

    "@angular/platform-browser-dynamic":
      "ng:platform-browser-dynamic/fesm2020/platform-browser-dynamic.mjs",
    "@angular/router": "ng:router/fesm2020/router.mjs",

    tslib: "npm:tslib.es6.js",

    rxjs: () => window.rxjs,
    "rxjs/operators": function () {
      let operators = window.rxjs.operators;
      return Object.assign({ __esModule: true, default: operators }, operators);
    },

    "zone.js": () => window.Zone,
    // typescript: () => window.ts,
    // babel: () => window.Babel,
    esbuild: () => esbuild,
  },
  // packages: {
  //   rxjs: {
  //     "": window.rxjs,
  //     "operators": LoaderJS.Module(
  //       window.rxjs.operators
  //     )
  //   }
  // },
  transformer: "esbuild-build",
  esbuild: {
    css: { loader: "css" },
  },
  cacheCompiled: false,
  tryNativeImport: false,
  defaultExtension: true,
  includeSourceMap: true,
  possibleExtensions: [],
});


await esbuild.initialize({
  wasmURL: "/src/assets/js/esbuild/esbuild.wasm"
});

await loader.import("/src/main.ts");
