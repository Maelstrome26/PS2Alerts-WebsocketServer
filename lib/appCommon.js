'use strict';

let observer = require('node-observer');
const config = require('../config.js');
const consoleLogger = require('./utilities/consoleLogger.js');
const _ = require('lodash');

module.exports = {
    'config': function() {
        return config;
    },
    'consoleLogger': function() {
        return consoleLogger;
    },
    'lodash': function() {
        return _;
    },
    'observer': function() {
        return observer;
    }
}
