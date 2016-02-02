'use strict';

const config = require('../config.js');
let cliColor = require('cli-color');

module.exports = {
    'debug': (message, type) => {
        if (config.debug[type] === true) {
            console.log(type, '[DEBUG] ' + message);
        }
    },
    'status': (message, type) => {
        console.log(cliColor.green.bold(type, '[STATUS] ' + message));
    },
    'info': (message, type) => {
        console.log(cliColor.blueBright(type, '[INFO] ' + message));
    },
    'warning': (message, type) => {
        console.log(cliColor.yellow(type, '[WARNING] ' + message));
    },
    'error': (message, type) => {
        console.log(cliColor.red.bold(type, '[ERROR] ' + message));
    },
    'critical': (message, type, stop) => {
        console.log(cliColor.red.bold(type, '[CRITICAL_ERROR] ' + message));

        if (stop === true) {
            throw('STOP');
        }
    },
};
