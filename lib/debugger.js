'use strict';

const config = require('../config.js');
let cliColor = require('cli-color');

function colorizeString(colorFun, args){
    args[0] = colorFun(args[0]);
    console.log.apply(console, args);
}

module.exports = {
    'debug': function debug(type, message) {
        if (config.debug[type] === true) {
            var args = Array.prototype.slice.call(arguments, status.length - 1);
            args[0] = '[DEBUG] ' + '(' + type + ') ' + message;
            console.log.apply(console, args);
        }
    },
    'status': function status(type, message) {
        var args = Array.prototype.slice.call(arguments, status.length - 1);
        args[0] = '[STATUS] ' + '(' + type + ') ' + message;
        colorizeString(cliColor.green.bold, args);
    },
    'info': function info(type, message) {
        var args = Array.prototype.slice.call(arguments, info.length - 1);
        args[0] = '[INFO] ' + '(' + type + ') ' + message;
        colorizeString(cliColor.blue, args);
    },
    'warning': function warning(type, message) {
        var args = Array.prototype.slice.call(arguments, warning.length - 1);
        args[0] = '[WARNING] ' + '(' + type + ') ' + message;
        colorizeString(cliColor.yellow, args);
    },
    'error': function error(type, message) {
        var args = Array.prototype.slice.call(arguments, error.length - 1);
        args[0] = '[ERROR] ' + '(' + type + ') ' + message;
        colorizeString(cliColor.red.bold, args);
    },
    'critical': function critical(type, message) {
        var args = Array.prototype.slice.call(arguments, critical.length - 1);
        args[0] = '[CRITICAL_ERROR] ' + '(' + type + ') ' + message;
        colorizeString(cliColor.red.bold, args);
    }
};
