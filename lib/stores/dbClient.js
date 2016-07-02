(function () {
    'use strict';

    const config = require('../../config.js');
    const db = require('knex')({
        client: 'mysql2',
        connection: {
            host:     config.database.primary.host,
            user:     config.database.primary.user,
            password: config.database.primary.pass,
            database: config.database.primary.name
        },
        pool: {
            min: 0,
            max: 10
        }
    });
    const dbCache = require('knex')({
        client: 'mysql2',
        connection: {
            host:     config.database.cache.host,
            user:     config.database.cache.user,
            password: config.database.cache.pass,
            database: config.database.cache.name
        },
        pool: {
            min: 0,
            max: 10
        }
    });
    let obj = {};

    obj.getDbClient = function() {
        return db;
    };

    obj.getDbCacheClient = function() {
        return dbCache;
    };

module.exports = obj;
}());
