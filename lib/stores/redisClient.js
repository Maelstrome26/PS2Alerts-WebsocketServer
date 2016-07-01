(function () {
    'use strict';

    const Promise = require('bluebird');
    const redis = require('redis');
    const config = require('../../config.js');
    let obj = {};

    Promise.promisifyAll(redis);

    obj.getRedisClient = function() {
        let options = {
            host: config.redis.host,
            port: config.redis.port,
            db: config.redis.db,
            //string_numbers: false // Force ints
        };

        if (config.redis.auth !== undefined) {
            options.auth = config.redis.auth;
        }

        return redis.createClient(options);
    }

    module.exports = obj;
}());
