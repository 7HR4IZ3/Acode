const { exec } = require('child_process');

const commands = [
  `live-server ./www --port 8080 --no-browser`,
  `webpack watch --progress --mode development`
];

function executeCommands(commands) {
  for (const command of commands) {
    console.log(`Executing: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing: ${command}`);
        console.error(error);
        process.exit(1);
      } else {
        console.log(stdout);
        console.error(stderr);
      }
    });
  }
}

executeCommands(commands);
