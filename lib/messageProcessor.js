(function () {
    'use strict';

    const _ = require('lodash');
    const moment = require('moment');
    const consoleLogger = require('./utilities/consoleLogger.js');
    const queryBuilders = require('./queryBuilders.js');
    const db = require('./stores/dbClient.js').getDbClient();
    const infoRepository = require('./repository/infoRepository.js');
    let obj = {};

    obj.process = function(payload) {
        payload.date = moment().format('YYYY-MM-DD');
        payload.type = parseInt(payload.experience_id);
        payload.amount = parseInt(payload.amount);

        // Get the player's outfit information
        Promise.all([
            infoRepository.getCharacterWithOutfit(payload.character_id),
        ]).then(function(character) {
            consoleLogger.debug('messageProcesor:getCharacterResult', JSON.stringify(character[0], null, 4));

            obj.updatePlayer(payload);
            obj.updateOutfit(payload, character[0].outfit);
        });
    };

    obj.updatePlayer = function(payload) {
        // Set up the queryObject
        let queryObject = obj.buildPlayerObject(payload);

        obj.executePlayerUpdate(queryObject, payload);
    }

    obj.updateOutfit = function(payload, outfit) {
        payload.outfit_id = outfit.id; // Merge outfit ID into payload
        // Set up the queryObject
        let queryObject = obj.buildOutfitObject(payload);

        obj.executeOutfitUpdate(queryObject, payload);
    }

    // Builds the object for players which is in a interchangable format for inserts and updates
    obj.buildPlayerObject = function(payload) {
        let returnObj =  {
            playerID: {
                op: '=',
                value: payload.character_id
            },
            date: {
                op: '=',
                value: payload.date
            },
            type: {
                op: '=',
                value: payload.type
            },
            world: {
                op: '=',
                value: parseInt(payload.world_id)
            },
            zone: {
                op: '=',
                value: parseInt(payload.zone_id)
            }
        };

        return returnObj;
    };

    // Builds the object for outfits which is in a interchangable format for inserts and updates
    obj.buildOutfitObject = function(payload) {
        let returnObj =  {
            outfitID: {
                op: '=',
                value: payload.outfit_id
            },
            date: {
                op: '=',
                value: payload.date
            },
            type: {
                op: '=',
                value: payload.type
            }
        };

        return returnObj;
    };

    // Updates the database with new info. Inserts if no such record exists.
    obj.executePlayerUpdate = function(queryObject, payload) {
        consoleLogger.debug('messageProcessor:executePlayerUpdate', 'Updating Player');

        let query = queryBuilders.buildWhereQuery(queryObject, 'players');

        // If related to cortium, increment the amount instead.
        if (payload.type === 674 || payload.type === 675) {
            query.increment('amount', payload.amount);
        } else {
            query.increment('occurances', 1);
        }

        query.then(function(rows) {
            if (rows !== 1) {
                obj.executePlayerInsert(queryObject, payload);
            }
        }).catch(function(error) {
            if (error.code === 'ER_DEADLOCK') {
                consoleLogger.warning('messageProcessor:executePlayerUpdate', 'Deadlock detected! Player: ' +payload.character_id + ' - Type: ' + payload.experience_id);
                obj.executePlayerUpdate(queryObject, payload); // Restart the transaction
            }
        });
    };

    obj.executePlayerInsert = function(queryObject, payload) {
        consoleLogger.debug('messageProcessor:executePlayerInsert', 'Inserting Player');

        let insertObject = queryBuilders.buildInsertObject(queryObject);

        if (payload.type === 674 || payload.type === 675) {
            insertObject.amount = payload.amount;
        } else {
            insertObject.occurances = 1;
        }

        let queryInsert = db.insert(insertObject).into('players');

        queryInsert.then(function() {
            consoleLogger.debug('messageProcessor:executePlayerInsert', 'Inserted new row for player: ', queryObject.payload.character_id);
        }).catch(function(error) {
            if (error.code === 'ER_DUP_ENTRY') {
                consoleLogger.warning('messageProcessor:executePlayerInsert', 'Duplicate detected! Player: ' + payload.character_id + ' - Type: ' + payload.experience_id);
                obj.executePlayerUpdate(queryObject, payload);
            }
            if (error.code === 'ER_DEADLOCK') {
                consoleLogger.warning('messageProcessor:executePlayerInsert', 'Deadlock detected! Player: ' + payload.character_id + ' - Type: ' + payload.experience_id);
                obj.executePlayerInsert(queryObject, payload); // Restart the transaction
            }
        });
    };

    // Updates the database with new info. Inserts if no such record exists.
    obj.executeOutfitUpdate = function(queryObject, payload) {
        consoleLogger.debug('messageProcessor:executeOutfitUpdate', 'Updating Outfit');

        let query = queryBuilders.buildWhereQuery(queryObject, 'outfits');

        // If related to cortium, increment the amount instead.
        if (payload.type === 674 || payload.type === 675) {
            query.increment('amount', payload.amount);
        } else {
            query.increment('occurances', 1);
        }

        query.then(function(rows) {
            if (rows !== 1) {
                obj.executeOutfitInsert(queryObject, payload);
            }
        }).catch(function(error) {
            if (error.code === 'ER_DEADLOCK') {
                consoleLogger.warning('messageProcessor:executeOutfitUpdate', 'Deadlock detected! Outfit: ' +payload.character_id + ' - Type: ' + payload.experience_id);
                obj.executeOutfitUpdate(queryObject, payload); // Restart the transaction
            }
        });
    };

    obj.executeOutfitInsert = function(queryObject, payload) {
        consoleLogger.debug('messageProcessor:executeOutfitInsert', 'Inserting Outfit');

        let insertObject = queryBuilders.buildInsertObject(queryObject);

        if (payload.type === 674 || payload.type === 675) {
            insertObject.amount = payload.amount;
        } else {
            insertObject.occurances = 1;
        }

        let queryInsert = db.insert(insertObject).into('outfits');

        queryInsert.then(function() {
            consoleLogger.debug('messageProcessor:executeOutfitInsert', 'Inserted new row for outfit: ', payload.outfit_id);
        }).catch(function(error) {
            if (error.code === 'ER_DUP_ENTRY') {
                consoleLogger.warning('messageProcessor:executeOutfitInsert', 'Duplicate detected! Outfit: ' + payload.outfit_id + ' - Type: ' + payload.experience_id);
                obj.executeOutfitUpdate(queryObject, payload);
            }
            if (error.code === 'ER_DEADLOCK') {
                consoleLogger.warning('messageProcessor:executeOutfitInsert', 'Deadlock detected! Outfit: ' + payload.outfit_id + ' - Type: ' + payload.experience_id);
                obj.executeOutfitInsert(queryObject, payload); // Restart the transaction
            }
        });
    };

    module.exports = obj;
}());
