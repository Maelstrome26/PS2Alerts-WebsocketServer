// Holds all dependencies which we'll be using again and again.
//
(function () {
    'use strict';

    const _ = require('lodash');
    const moment = require('moment');
    const consoleLogger = require('./utilities/consoleLogger.js');
    const queryBuilders = require('./queryBuilders.js');
    const db = require('./stores/dbClient.js').getDbClient();

    module.exports = {
        'lodash': function() {
            return _;
        },
        'moment': function() {
            return moment;
        },
        'db': function() {
            return db;
        }
    }
}());
