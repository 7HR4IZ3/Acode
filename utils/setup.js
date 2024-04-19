// setup acode for the first time
// 1. install dependencies
// 2. add cordova platform android@10.2
// 3. install cordova plugins 
// cordova-plugin-buildinfo
// cordova-plugin-device
// cordova-plugin-file
// all the plugins in ./src/plugins

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const PLATFORM_FILES = ['.DS_Store'];

execSync('npm install', { stdio: 'inherit' });

execSync('sudo apt-get install android-sdk', { stdio: 'inherit' });
execSync('export ANDROID_HOME=/usr/lib/android-sdk', { stdio: 'inherit' });

try {
  execSync('cordova platform add android', { stdio: 'inherit' });
} catch (error) {
  // ignore
}

execSync('cordova prepare', { stdio: 'inherit' });
execSync('mkdir -p www/css/build www/js/build', { stdio: 'inherit' });

execSync('cordova plugin add cordova-plugin-buildinfo', { stdio: 'inherit' });
execSync('cordova plugin add cordova-plugin-device', { stdio: 'inherit' });
execSync('cordova plugin add cordova-plugin-file', { stdio: 'inherit' });

const plugins = fs.readdirSync(path.join(__dirname, '../src/plugins'));
plugins.forEach(plugin => {
  if (PLATFORM_FILES.includes(plugin) || plugin.startsWith('.')) return;
  execSync(`cordova plugin add ./src/plugins/${plugin}`, { stdio: 'inherit' });
});

execSync('sdkmanager "build-tools;30.0.3"', { stdio: 'inherit' });