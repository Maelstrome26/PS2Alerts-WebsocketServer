(function () {
    'use strict';

    let colors = require('colors');
    const config = require('../../config.js');
    const fileLogger = require('./fileLogger.js');
    const process = require('process');
    const emailer = require('./emailer.js');

    let obj = {};

    obj.critical = function(key, message) {
        let toLog = 'CRITICAL ERROR: ' + obj.getFormattedDateString(key, message);
        fileLogger.writeToLog(toLog);
        console.log(colors.red(toLog));

        Promise.all([
            emailer.sendMessage(toLog, 'Websocket Server: CRITICAL Error detected!')
        ]).then(function(result) {
            console.log('Email sent');
            console.log(colors.red('TERMINATING PROCESS. I\'LL BE BACK.'));
            process.exit(1);
        });
    };

    obj.debug = function(key, message) {
        if (config.allowedDebug.indexOf(key) !== -1) {
            let toLog = 'DEBUG: ' + obj.getFormattedDateString(key, message);
            return console.log(colors.white(toLog));
        }
    };

    obj.error = function(key, message, notify) {
        let toLog = 'ERROR: ' + obj.getFormattedDateString(key, message);
        fileLogger.writeToLog(toLog);
        console.log(colors.red(toLog));

        if (notify) {
            Promise.all([
                emailer.sendMessage(toLog, 'Websocket Server: Error detected!')
            ]).then(function(result) {
                console.log('Email sent');
            });
        }
    };

    obj.info = function(key, message) {
        let toLog = 'INFO: ' + obj.getFormattedDateString(key, message);
        return console.log(colors.blue(toLog));
    };

    obj.status = function(key, message) {
        let toLog = 'STATUS: ' +obj.getFormattedDateString(key, message);
        fileLogger.writeToLog(toLog);
        return console.log(colors.cyan(toLog));
    };

    obj.success = function(key, message) {
        let toLog = 'SUCCESS: ' +obj.getFormattedDateString(key, message);
        return console.log(colors.green(toLog));
    };

    obj.warning = function(key, message) {
        let toLog = 'WARNING: ' +obj.getFormattedDateString(key, message);
        return console.log(colors.yellow(toLog));
    };

    obj.getFormattedDateString = function(key, message) {
        let date = new Date().toLocaleTimeString();
        return '['+date+'] '+key+': '+message;
    };

    module.exports = obj;
}());
