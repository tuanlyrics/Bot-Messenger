const chalk = require('chalk');
const gradient = require('gradient-string');
const con = require('./../../config.json');
const theme = con.DESIGN.Theme;
let co;
let error;

// Always use rainbow gradient for tags, no background for messages/icons
co = gradient.rainbow;
error = chalk.red.bold;

// Main logger function
module.exports = (data, option = "INFO") => {
  let icon = '';
  let tag = '';
  let msg = '';
  switch ((option || '').toLowerCase()) {
    case 'warn':
      icon = chalk.yellow('⚠');
      tag = co('[ WARN ]');
      msg = chalk.yellowBright(data);
      break;
    case 'error':
      icon = chalk.red('✖');
      tag = co('[ ERROR ]');
      msg = chalk.redBright(data);
      break;
    case 'success':
      icon = chalk.green('✔');
      tag = co('[ SUCCESS ]');
      msg = chalk.greenBright(data);
      break;
    case 'info':
      icon = chalk.cyan('ℹ');
      tag = co('[ INFO ]');
      msg = chalk.cyanBright(data);
      break;
    default:
      icon = chalk.magenta('•');
      tag = co(`${option.toUpperCase()}`);
      msg = chalk.magentaBright(data);
      break;
  }
  console.log(`${tag} ${msg}`);
};

// Loader logger function
module.exports.loader = (data, option = "info") => {
  let icon = '';
  let tag = co('[ PCODER ]');
  let msg = '';
  switch ((option || '').toLowerCase()) {
    case 'warn':
      icon = chalk.yellow('⚠');
      msg = chalk.yellowBright(data);
      break;
    case 'error':
      icon = chalk.red('✖');
      msg = chalk.redBright(data);
      break;
    case 'success':
      icon = chalk.green('✔');
      msg = chalk.greenBright(data);
      break;
    default:
      icon = chalk.cyan('ℹ');
      msg = chalk.cyanBright(data);
      break;
  }
  console.log(`${tag} ${msg}`);
};

// Extra: Success log shortcut
module.exports.success = (data) => {
  const coloredData = chalk.greenBright('[ SUCCESS ] - ') + chalk.white(data);
  console.log(coloredData);
};