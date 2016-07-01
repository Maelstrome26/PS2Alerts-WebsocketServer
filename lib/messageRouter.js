(function () {
    'use strict';

    const config = require('../config.js');
    const consoleLogger = require('./utilities/consoleLogger.js');
    const messageProcessor = require('./messageProcessor.js');
    const _ = require('lodash');
    const processorRouter = require('processor/router.js');

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
            // If it's a message for a subscribed event
            if (message.payload.event_name) {
                if (_.indexOf(config.events, message.payload.event_name) !== -1) {

                    return obj.onMetricMessage(message.payload);
                }
            } else {
                if (config.statusMessages.census) {
                    consoleLogger.debug('censusResponses', JSON.stringify(message, null, 4));
                }
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

    obj.onMetricMessage = function(payload) {
        consoleLogger.debug('onMetricMessage', JSON.stringify(payload, null, 4));

        let messageType = payload.event_name;

        switch messageType {
            case 'Death': {
                processorRouter.onDeath(payload);
                break;
            }
            case 'GainExperience': {
                processorRouter.onGainExperience(payload);
                break;
            }
            case 'FacilityControl': {
                processorRouter.onFacilityControl(payload);
                break;
            }
            case 'MetagameEvent': {
                processorRouter.onMetagameEvent(payload);
                break;
            }
            case 'PlayerFacilityCapture': {
                processorRouter.onPlayerFacilityCapture(payload);
                break;
            }
            case 'PlayerFacilityDefend': {
                processorRouter.onPlayerFacilityDefend(payload);
                break;
            }
            case 'VehicleDestroy': {
                processorRouter.onVehicleDestroy(payload);
                break;
            }
            default: {
                consoleLogger.error('messageRouter:onMetricMessage', 'Unknown message type!');
                break;
            }
        }
    };

    module.exports = obj;
}());
