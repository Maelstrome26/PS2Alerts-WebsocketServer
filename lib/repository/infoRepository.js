(function () {
    'use strict';

    const censusQuery = require('../census/censusQuery.js');
    const consoleLogger = require('../utilities/consoleLogger.js');
    const censusParser = require('../census/censusParser.js');
    const redisClient = require('../stores/redisClient.js').;
    let obj = {};

    obj.getCharacterWithOutfit = function(id) {
        return new Promise(function(resolve, reject) {
            consoleLogger.debug('infoRepository:getCharacterWithOutfit', 'Getting character with Outfit: ' + id);
            obj.getCharacter(id).then(function(returned) {
                consoleLogger.debug('infoRepository:getCharacterWithOutfit', 'Returned character: ' + id);
                let player = returned;

                if (player.outfit) {
                    obj.getOutfit(player.outfit).then(function(outfit) {
                        consoleLogger.debug('infoRepository:getCharacterWithOutfit', 'Returned outfit: ' + id);

                        player.outfit = outfit;

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
            obj.checkRedis(redisKey)
            .then(function(data) {
                if (! data) {
                    consoleLogger.debug('infoRepository:getCharacter', 'Redis missed: '+redisKey);
                    let result = censusQuery.getCharacter(id);
                    result.then(function(returned) {
                        consoleLogger.debug('infoRepository:getCharacter', 'Returned character: ' + id);
                        let character = censusParser.parseCharacter(returned);

                        redisClient.set(redisKey, JSON.stringify(character));

                        resolve(character);
                    });
                } else {
                    consoleLogger.debug('infoRepository:getCharacter', 'Redis hit: '+redisKey);
                    resolve(JSON.parse(data));
                }
            });
        });
    };

    obj.getOutfit = function(id) {
        return new Promise(function(resolve, reject) {
            consoleLogger.debug('infoRepository:getOutfit', 'Getting outfit: ' + id);

            let redisKey = 'ps2:outfit:' + id;

            // First, check redis for any outfit info
            obj.checkRedis(redisKey).then(function(value) {
                if (! value) {
                    consoleLogger.debug('infoRepository:getOutfit', 'Redis missed: '+redisKey);

                    let result = censusQuery.getOutfit(id);
                    result.then(function(returned) {
                        consoleLogger.debug('infoRepository:getOutfit', 'Returned outfit: ' + id);
                        let outfit = censusParser.parseOutfit(returned);

                        redis.set(redisKey, JSON.stringify(outfit));
                        resolve(outfit);
                    });
                } else {
                    consoleLogger.debug('infoRepository:getOutfit', 'Redis hit: '+redisKey);
                    resolve(JSON.parse(value));
                }
            });
        });
    }

    obj.checkRedis = function(redisKey) {
        return new Promise(function(resolve, reject) {
            redisClient.get(redisKey).then(function(res) {
                resolve(res);
            });
        });
    };

    module.exports = obj;
}());
