// Holds all dependencies which we'll be using again and again.
//
(function () {
    'use strict';

    const _ = require('lodash');
    const moment = require('moment');
    const consoleLogger = require('../utilities/consoleLogger.js');
    const db = require('../stores/dbClient.js').getDbClient();
    const queryBuilder = require('../stores/queryBuilders.js');

    module.exports = {
        'consoleLogger': function() {
            return consoleLogger;
        },
        'db': function() {
            return db;
        },
        'lodash': function() {
            return _;
        },
        'moment': function() {
            return moment;
        },
        'queryBuilders': function() {
            return queryBuilder;
        }
    }
}());
