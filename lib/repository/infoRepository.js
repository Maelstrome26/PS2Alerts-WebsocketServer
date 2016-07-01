(function () {
    'use strict';

    const censusQuery = require('../census/censusQuery.js');
    const consoleLogger = require('../utilities/consoleLogger.js');
    const censusParser = require('../census/censusParser.js');
    const redis = require('../stores/redisClient.js').getRedisClient();
    let obj = {};

    obj.getCharacterWithOutfit = function(id) {
        return new Promise(function(resolve, reject) {
            consoleLogger.debug('infoRepository:getCharacterWithOutfit', 'Getting character with Outfit: ' + id);
            Promise.all([
                obj.getCharacter(id)
            ]).then(function(returned) {
                consoleLogger.debug('infoRepository:getCharacterWithOutfit', 'Returned character: ' + id);
                let player = returned[0];

                if (player.outfit) {
                    Promise.all([
                        obj.getOutfit(player.outfit)
                    ]).then(function(outfit) {
                        consoleLogger.debug('infoRepository:getCharacterWithOutfit', 'Returned outfit: ' + id);

                        player.outfit = outfit[0];

                        resolve(player);
                    });
                } else {
                    resolve(player);
                }
            });
        })
    }

    obj.getCharacter = function(id) {
        return new Promise(function(resolve, reject) {
            consoleLogger.debug('infoRepository:getCharacter', 'Getting character: ' + id);
            let redisKey = 'ps2:player:' + id;

            // First, check Redis for the player info
            Promise.all([
                obj.checkRedis(redisKey)
            ]).then(function(values) {
                if (! values[0]) {
                    consoleLogger.debug('infoRepository:getCharacter', 'Redis missed: '+redisKey);
                    let result = censusQuery.getCharacter(id);
                    result.then(function(returned) {
                        consoleLogger.debug('infoRepository:getCharacter', 'Returned character: ' + id);
                        let character = censusParser.parseCharacter(returned[0]);

                        redis.set(redisKey, JSON.stringify(character));

                        resolve(character);
                    });
                } else {
                    consoleLogger.debug('infoRepository:getCharacter', 'Redis hit: '+redisKey);

                    resolve(JSON.parse(values[0]));
                }
            });
        });
    };

    obj.getOutfit = function(id) {
        return new Promise(function(resolve, reject) {
            consoleLogger.debug('infoRepository:getOutfit', 'Getting outfit: ' + id);

            let redisKey = 'ps2:outfit:' + id;

            // First, check redis for any outfit info
            Promise.all([
                obj.checkRedis(redisKey)
            ]).then(function(values) {
                if (! values[0]) {
                    consoleLogger.debug('infoRepository:getOutfit', 'Redis missed: '+redisKey);

                    let result = censusQuery.getOutfit(id);
                    result.then(function(returned) {
                        consoleLogger.debug('infoRepository:getOutfit', 'Returned outfit: ' + id);
                        let outfit = censusParser.parseOutfit(returned[0]);

                        redis.set(redisKey, JSON.stringify(outfit));

                        resolve(outfit);
                    });
                } else {
                    consoleLogger.debug('infoRepository:getOutfit', 'Redis hit: '+redisKey);

                    resolve(JSON.parse(values[0]));
                }
            });
        });
    }

    obj.checkRedis = function(redisKey) {
        return new Promise(function(resolve, reject) {
            redis.getAsync(redisKey).then(function(res) {
                resolve(res);
            });
        });
    };

    module.exports = obj;
}());
