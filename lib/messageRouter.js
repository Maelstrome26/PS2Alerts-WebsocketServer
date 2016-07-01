(function () {
    'use strict';

    const config = require('../config.js');
    const consoleLogger = require('./utilities/consoleLogger.js');
    const messageProcessor = require('./messageProcessor.js');
    const _ = require('lodash');

    let obj = {};
    let ignoreTypes = [
       'heartbeat',
       'serviceStateChanged',
       'connectionStateChanged'
    ];

    obj.onMessage = function(message, callback) {
        try {
            message = JSON.parse(message);
        } catch (err) {
            consoleLogger.error('websocketModule', 'Unable to parse message!');
            consoleLogger.error(messages);
        }

        // Filter out unrecognized types
        let type = message.type;

        if (message.subscription) {
            return obj.onSubscription(message);
        }

        if (type === 'heartbeat') {
            callback('heartbeat');
        }

        if (type === 'serviceMessage' && message.payload) {
            let xpType = parseInt(message.payload.experience_id);

            if (_.indexOf(config.constructionTypes, xpType) !== -1) {
                if (config.statusMessages.census && type == 'serviceMessage') {
                    consoleLogger.debug('censusResponses', JSON.stringify(message, null, 4));
                }
                return obj.onXpMessage(message.payload);
            }
        }

        if (ignoreTypes.indexOf(type) === -1) {
            if (type !== 'serviceMessage') {
                consoleLogger.debug('websocketModule', 'Ignoring message of type: '+type);
            }
            return false;
        }
    };

    // Handle the subscription returns
    obj.onSubscription = function(message) {
        consoleLogger.debug('censusResponses', JSON.stringify(message, null, 4));
    };

    obj.onXpMessage = function(payload) {
        consoleLogger.debug('censusXpMessage', JSON.stringify(payload, null, 4));
        messageProcessor.process(payload);
    };

    module.exports = obj;
}());
