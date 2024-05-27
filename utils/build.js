const { exec } = require('child_process');

let platform = process.argv[2] || 'android';
let app = process.argv[3] || 'node';
let mode = process.argv[4] || 'd';
let webpackmode = 'development';
let cordovamode = '';

if (mode === 'p' || mode === 'prod') {
  mode = 'p';
  webpackmode = 'production';
  cordovamode = '--release';
}

const RED = '\033[0;31m';  // Escape sequence for red color (optional)
const NC = '\033[0m';    // Escape sequence for reset color (optional)

const script1 = `node ./utils/config.js ${mode} ${app}`;
const script2 = `webpack --progress --mode ${webpackmode}`;
const script3 = `node ./utils/loadStyles.js`;
const script4 = `cordova build ${platform} ${cordovamode} -- --jvmargs='-Xmx1536M --add-exports=java.base/sun.nio.ch=ALL-UNNAMED --add-opens=java.base/java.lang=ALL-UNNAMED --add-opens=java.base/java.lang.reflect=ALL-UNNAMED --add-opens=java.base/java.io=ALL-UNNAMED --add-exports=jdk.unsupported/sun.misc=ALL-UNNAMED'`;
const script5 = `node ./utils/rename.js ${mode} ${app}`;

const scripts = [script1, script2, script3, script4, script5];

function executeScript(script, index) {
  if (index >= scripts.length) {
    // Loop through files after all scripts finish
    const fs = require('fs');
    fs.readdir('.', (err, files) => {
      if (err) throw err;
      files.forEach(file => {
        console.log(`File -> ${file}`);
      });
    });
    return;
  }

  console.log(`${RED}${script}${NC}`);
  exec(script, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing script: ${script}`);
      console.error(error);
      process.exit(1);
    } else {
      stdout && console.log(stdout);
      stderr && console.error(stderr);
      executeScript(scripts[index + 1], index + 1);
    }
  });
}

executeScript(scripts[0], 0);
