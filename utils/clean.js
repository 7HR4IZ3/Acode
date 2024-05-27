const { exec } = require('child_process');

let platform_rm = process.argv[2] || 'android';
let platform_add = process.argv[3] || platform_rm;

const commands = [
  `cordova platform rm ${platform_rm}`,
  `cordova platform add ${platform_add}`,
  'cordova plugin add cordova-plugin-file'
];

function executeCommands(commands, index = 0) {
  if (index >= commands.length) {
    return;
  }

  console.log(`Executing: ${commands[index]}`);
  exec(commands[index], (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing: ${commands[index]}`);
      console.error(error);
      process.exit(1);
    } else {
      console.log(stdout);
      console.error(stderr);
      executeCommands(commands, index + 1);
    }
  });
}

executeCommands(commands);
