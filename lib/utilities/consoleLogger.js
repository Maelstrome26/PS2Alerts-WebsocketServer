(function () {
   'use strict';

   let colors = require('colors');
   const config = require('../../config.js');

   let obj = {};

   obj.status = function(key, message) {
       return console.log(colors.cyan('STATUS: ' +obj.getFormattedString(key, message)));
   };

   obj.error = function(key, message) {
       return console.log(colors.red('ERROR: ' + obj.getFormattedString(key, message)));
   };

   obj.info = function(key, message) {
       return console.log(colors.blue('INFO: ' + obj.getFormattedString(key, message)));
   };

   obj.warning = function(key, message) {
       return console.log(colors.yellow('WARNING: ' +obj.getFormattedString(key, message)));
   };

   obj.success = function(key, message) {
       return console.log(colors.green('SUCCESS: ' +obj.getFormattedString(key, message)));
   };

   obj.debug = function(key, message) {
       if (config.allowedDebug.indexOf(key) !== -1) {
           return console.log(colors.white('DEBUG: ' + obj.getFormattedString(key, message)));
       }
   };

   obj.getFormattedString = function(key, message) {
       let date = new Date().toLocaleTimeString();

       return '['+date+'] ' + key+': '+message;
   };

   module.exports = obj;
}());
