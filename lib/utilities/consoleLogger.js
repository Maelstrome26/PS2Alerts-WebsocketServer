(function () {
    'use strict';

    let colors = require('colors');
    const config = require('../../config.js');
    const logger = require('./fileLogger.js');

    let obj = {};

    obj.status = function(key, message) {
        let toLog = 'STATUS: ' +obj.getFormattedDateString(key, message);
        logger.writeToLog(toLog);
        return console.log(colors.cyan(toLog));
    };

    obj.error = function(key, message) {
        let toLog = 'ERROR: ' + obj.getFormattedDateString(key, message);
        logger.writeToLog(toLog);
        return console.log(colors.red(toLog));
    };

    obj.info = function(key, message) {
        let toLog = 'INFO: ' + obj.getFormattedDateString(key, message);
        return console.log(colors.blue(toLog));
    };

    obj.warning = function(key, message) {
        let toLog = 'WARNING: ' +obj.getFormattedDateString(key, message);
        return console.log(colors.yellow(toLog));
    };

    obj.success = function(key, message) {
        let toLog = 'SUCCESS: ' +obj.getFormattedDateString(key, message);
        return console.log(colors.green(toLog));
    };

    obj.debug = function(key, message) {
        if (config.allowedDebug.indexOf(key) !== -1) {
            let toLog = 'DEBUG: ' + obj.getFormattedDateString(key, message);
            return console.log(colors.white(toLog));
        }
    };

    obj.getFormattedDateString = function(key, message) {
        let date = new Date().toLocaleTimeString();
        return '['+date+'] '+key+': '+message;
    };

    module.exports = obj;
}());
