import fs from "node:fs";
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: resolve("www"),
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.jsx?$/,
    exclude: []
  },
  assetsInclude: ['**/*.hbs'],
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' }
      // plugins: [
      //   {
      //     name: "load-js-files-as-jsx",
      //     setup(build) {
      //       build.onLoad({ filter: /src\/.*\.js$/ }, async args => {
      //         return {
      //           loader: "jsx",
      //           contents: await fs.readFile(
      //             args.path, "utf8"
      //           )
      //         };
      //       });
      //     }
      //   }
      // ]
    }
  },
  build: {
    outDir: resolve("www", "js", "bundle"), // Output directory for production build
    emptyOutDir: true, // Clear output directory before building (similar to clearOutputDir)
    // rollupOptions: {
    //   input: {
    //     index: resolve("www", "index.html"),
    //     main: resolve("src", "lib", "main.js"),
    //     console: resolve("src", "lib", "console.js"),
    //     searchInFilesWorker: resolve(
    //       "src",
    //       "sidebarApps",
    //       "searchInFiles",
    //       "worker.js"
    //     )
    //   }
    // }
  },
  resolve: {
    alias: {
      lib: resolve('src', 'lib/'),
      styles: resolve('src', 'styles/'),
      dialogs: resolve('src', 'dialogs/'),
      utils: resolve('src', 'utils/'),
      components: resolve('src', 'components/'),
      fileSystem: resolve('src', 'fileSystem/'),
      handlers: resolve('src', 'handlers/'),
      lang: resolve('src', 'lang/'),
      pages: resolve('src', 'pages/'),
      plugins: resolve('src', 'plugins/'),
      palettes: resolve('src', 'palettes/'),
      settings: resolve('src', 'settings/'),
      sidebarApps: resolve('src', 'sidebarApps/'),
      theme: resolve('src', 'theme/'),
      views: resolve('src', 'views/'),
      ace: resolve('src', 'ace/'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Import global styles
      }
    }
  },
  plugins: [], // No direct equivalent to MiniCssExtractPlugin in Vite, handled by CSS preprocessors
  server: {
    // Optional server configuration
  }
});
