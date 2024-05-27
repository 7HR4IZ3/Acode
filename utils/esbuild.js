const path = require("path");
const fs = require("node:fs");
const esbuild = require("esbuild");
const {sassPlugin} = require('esbuild-sass-plugin');

const dist = path.resolve("./www/bundle");

try {
  fs.rmSync(dist, { recursive: true })
} catch {}

async function main() {
  const options = {
    entryPoints: [
      "src/main.js", "src/libs/console.js",
      "src/components/sidebar-apps/searchInFiles/worker.js"
    ],
    bundle: true, outdir: dist,
    tsconfig: "./tsconfig.json",
    format: "esm", minify: false,
    splitting: true, loader: {
      ".js": "jsx",
      ".ts": "tsx",
      ".hbs": "text",
      ".scss": "css"
    },
    alias: { path: "path-browserify" },
    plugins: [
      sassPlugin({ filter: /\.scss$/, type: 'style' })
    ],
    jsx: "automatic", jsxSideEffects: true,
    jsxImportSource: "html-tag-jsx",
  };

  if (process.argv[2] === "watch") {
    let ctx = await esbuild.context(options);
    console.log("* Watching files...");
    await ctx.watch();
  } else {
    console.log("* Building...");
    await esbuild.build(options)
    console.log("* Build completed...");
  }
}

main();