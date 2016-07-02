// Holds all dependencies which we'll be using again and again.
//
(function () {
    'use strict';

    const _ = require('lodash');
    const moment = require('moment-timezone');
    const consoleLogger = require('../utilities/consoleLogger.js');
    const db = require('../stores/dbClient.js').getDbClient();
    const queryBuilder = require('../stores/queryBuilders.js');
    const objectFactory = require('../stores/dbObjectFactory.js');

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
        'objectFactory': function() {
            return objectFactory;
        },
        'queryBuilder': function() {
            return queryBuilder;
        }
    }
}());
