(function () {
    'use strict';

    const Promise = require('bluebird');
    const redis = require('redis');
    const config = require('../../config.js');
    const consoleLogger = require('../utilities/consoleLogger.js');
    let observer = require('node-observer');

    Promise.promisifyAll(redis);

    let obj = {};

    let options = {
        host: config.redis.host,
        port: config.redis.port,
        db: config.redis.db,
        //string_numbers: false // Force ints
    };
    let client = redis.createClient(options);

    client.on('error', function (err) {
        consoleLogger.error('redisClient', 'REDIS ERROR! - ' + client.host + ':' + client.port + ' - ' + err);
    });

    obj.getRedisClient = function() {
        return client;
    }

    obj.get = function(key) {
        return new Promise (function(resolve, reject) {
            console.log('getting', key);
            client.get(key, function(err, res) {
                console.log('client got', res);
                let object = JSON.parse(res);
                resolve(object);
            });
        })
    }

    obj.redisSet = function(data) {
        console.log('redisSet fired');
        client.set(data.key, data.value, function(err, res) {
            console.log('set');
            consoleLogger.debug('redisClient', 'Set value to redis: '+data.key);
        });
    }

    obj.redisSetEx = function(data) {
        console.log('redisSetEx fired');
        let time = 86400; // 1 Day

        if (data.time) {
            time = data.time;
        }

        consoleLogger.debug('redisClient', 'Setting data...');
        client.setex(data.key, time, data.value, function(err, res) {
            console.log('set');
            consoleLogger.debug('redisClient', 'Set value to redis: '+data.key);
        });
    }

    observer.subscribe(this, 'redisSet', function(who, data) {
        obj.redisSet(data);
    });

    observer.subscribe(this, 'redisSetEx', function(who, data) {
        obj.redisSetEx(data);
    });


    module.exports = obj;
}());
