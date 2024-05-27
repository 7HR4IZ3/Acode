const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const ANDROID_WWW = path.resolve(
  __dirname,
  "platforms/android/app/src/main/assets/www"
);
const WWW = path.resolve(__dirname, "www");

module.exports = (env, options) => {
  const { mode = "development" } = options;
  const rules = [
    {
      test: /\.hbs$/,
      use: ["raw-loader"]
    },
    {
      test: /\.module.(sa|sc|c)ss$/,
      use: ["raw-loader", "postcss-loader", "sass-loader"]
    },
    {
      test: /(?<!\.module)\.(sa|sc|c)ss$/,
      use: [
        {
          loader: MiniCssExtractPlugin.loader,
          options: { publicPath: "../../" }
        },
        {
          loader: "css-loader",
          options: { url: false }
        },
        "postcss-loader",
        "sass-loader"
      ]
    },
    {
      test: /\.tsx?$/,
      use: 'ts-loader', 
      exclude: /node_modules/
    }
  ];

  rules.push({
    test: /\.m?js$/,
    use: [
      "html-tag-js/jsx/tag-loader.js",
      {
        loader: "babel-loader",
        options: {
          presets: ["@babel/preset-env"]
        }
      }
    ]
  });


  if (mode !== "development") {
    clearOutputDir();
  }

  const main = {
    mode,
    // entry: {
    //   main: "./src/lib/main.js",
    //   console: "./src/lib/console.js",
    //   searchInFilesWorker:
    //     "./src/components/sidebar-apps/searchInFiles/worker.js"
    // },
    entry: {
      main: "./src/lib/main.js",
      console: "./src/lib/console.js",
      searchInFilesWorker: "./src/sidebarApps/searchInFiles/worker.js"
    },
    output: {
      publicPath: "./js/build/",
      filename: "[name].build.js",
      chunkFilename: "[name].build.js",
      path: path.resolve(WWW, "js/build/")
    },
    module: {
      rules
    },
    resolve: {
      fallback: {
        crypto: false,
        path: require.resolve("path-browserify")
      },
      modules: ["node_modules", "src"]
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: "../../css/build/[name].css"
      })
    ]
  };

  return [main];
};

function clearOutputDir() {
  const css = path.join(WWW, "css/build");
  const js = path.join(WWW, "js/build");

  fs.rmSync(css, { recursive: true });
  fs.rmSync(js, { recursive: true });

  fs.mkdir(css, err => {
    if (err) console.log(err);
  });
  fs.mkdir(js, err => {
    if (err) console.log(err);
  });
}
