// setup acode for the first time
// 1. install dependencies
// 2. add cordova platform android@10.2
// 3. install cordova plugins 
// cordova-plugin-buildinfo
// cordova-plugin-device
// cordova-plugin-file
// all the plugins in ./src/plugins

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Setting up the project...');

function executeCommand(command, callback) {
  console.log(`Executing: ${command}`);
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing: ${command}`);
      console.error(error);
      process.exit(1);
    } else {
      console.log(stdout);
      console.error(stderr);
      if (callback) callback();
    }
  });
}

function setupProject() {
  console.log('Setting up Android SDK...');
  executeCommand('sudo apt-get install android-sdk', () => {
    process.env.ANDROID_HOME = '/usr/lib/android-sdk';
    executeCommand('sudo apt install sdkmanager', setupAndroid);
  });
}

function setupAndroid() {
  console.log('Setting up Android...');
  executeCommand('cordova platform add android', setupCordovaPlugins);
}

function setupCordovaPlugins() {
  console.log('Setting up cordova plugins...');
  const plugins = [
    'cordova-plugin-buildinfo',
    'cordova-plugin-device',
    'cordova-plugin-file'
  ];

  let index = 0;
  function addNextPlugin() {
    if (index < plugins.length) {
      executeCommand(`cordova plugin add ${plugins[index++]}`, addNextPlugin);
    } else {
      addLocalPlugins();
    }
  }
  addNextPlugin();
}

function addLocalPlugins() {
  const PLATFORM_FILES = ['.DS_Store'];
  const PLUGINS_DIR = path.resolve(__dirname, '../../packages/plugins');

  fs.readdir(PLUGINS_DIR, (err, files) => {
    if (err) {
      console.error(`Error reading plugins directory: ${PLUGINS_DIR}`);
      console.error(err);
      process.exit(1);
    }

    const filteredPlugins = files.filter(plugin => !PLATFORM_FILES.includes(plugin) && !plugin.startsWith('.'));
    let index = 0;

    function addNextLocalPlugin() {
      if (index < filteredPlugins.length) {
        executeCommand(`cordova plugin add ${path.join(PLUGINS_DIR, filteredPlugins[index++])}`, addNextLocalPlugin);
      } else {
        finalizeSetup();
      }
    }
    addNextLocalPlugin();
  });
}

function finalizeSetup() {
  executeCommand('cordova prepare', () => {
    executeCommand('sdkmanager "build-tools;30.0.3"', () => {
      fs.mkdirSync('www/css/build', { recursive: true });
      fs.mkdirSync('www/js/build', { recursive: true });
      console.log('Project setup complete.');
    });
  });
}

setupProject();
