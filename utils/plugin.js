const { exec } = require('child_process');

const plugin_rm = process.argv[2];
const plugin_add = process.argv[3] || plugin_rm;

if (!plugin_rm) {
  console.error('Error: Plugin name to remove must be provided.');
  process.exit(1);
}

const commands = [
  `cordova plugin rm ${plugin_rm}`,
  `cordova plugin add ${plugin_add}`
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
