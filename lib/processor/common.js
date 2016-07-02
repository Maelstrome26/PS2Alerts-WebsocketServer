// Holds all dependencies which we'll be using again and again.
//
(function () {
    'use strict';

    const _ = require('lodash');
    const moment = require('moment');
    const consoleLogger = require('../utilities/consoleLogger.js');
    const db = require('../stores/dbClient.js').getDbClient();

    module.exports = {
        'db': function() {
            return db;
        },
        'consoleLogger': function() {
            return consoleLogger
        },
        'lodash': function() {
            return _;
        },
        'moment': function() {
            return moment;
        }
    }
}());
