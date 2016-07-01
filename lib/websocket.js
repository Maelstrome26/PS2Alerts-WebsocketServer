(function () {
    'use strict';

    const config = require('../config.js');

    let ws = require('ws');
    let consoleLogger = require('./utilities/consoleLogger.js');
    let messageRouter = require('./messageRouter.js');

    let obj = {};
    let websocketClient;

    // Heartbeat will be set to true if we've got them from census. The interval
    // will set this to false after a certain time. We then check the heartbeat
    // variable. If it's false, we reset the script.
    let heartbeat = false;
    let heartbeatInterval;
    let heartbeatCountdown;

    let environment;

    let type;
    let typeString;

    obj.initWebsocket = function(passedEnv, passedType) {
        // Set it to globally for the module so it can be passed again should it be reset
        environment = passedEnv;
        type = passedType;
        typeString = '['+passedEnv+'-'+type+']:';

        let path = 'wss://push.planetside2.com/streaming?environment='+environment+'&service-id=s:'+config.censusServiceId;
        consoleLogger.status('censusWebsocketStatus', typeString+' Initializing websocket connection to Census ('+environment+')');
        consoleLogger.status('censusWebsocketStatus', path);

        websocketClient = new ws(path);

        // Register event handlers
        websocketClient.on('message', function (message) {
            messageRouter.onMessage(message, function(callback) {
                // If we got a heartbeat, keep keep the variable true.
                if (callback === 'heartbeat') {
                    consoleLogger.debug('websocket:heartbeat', typeString+' Got heartbeat');

                    heartbeat = true;

                    obj.setHeartbeatCountdown();
                }
            });
        });

        websocketClient.on('open', function () {
            consoleLogger.success('censusWebsocketStatus', typeString+' Websocket Open!');
            heartbeat = true;
            obj.fireSubscriptions();

            heartbeatInterval = setInterval(function() {
                obj.checkHeartbeat();
            }, 35000);
            obj.setHeartbeatCountdown();
            consoleLogger.status('websocket:heartbeat', typeString+' Heartbeat check registered');
        });

        websocketClient.on('error', function (error) {
           consoleLogger.error('censusWebsocketStatus', typeString+' WEBSOCKET ERROR: ' + error);
           obj.restartSocket();
        });

        websocketClient.on('close', function() {
            consoleLogger.error('censusWebsocketStatus', typeString+' WEBSOCKET CLOSED!');
            heartbeat = false;
        })
    };

    obj.isConnected = function() {
        consoleLogger.debug('server:websocketStatus', typeString+' Returning websocket status: ' + heartbeat)
        return heartbeat;
    }

    obj.restartSocket = function() {
        consoleLogger.error('censusWebsocketStatus', typeString+' Killing websocket!');

        try {
            websocketClient.close();
        } catch(e) {
            consoleLogger.error('consoleWebsocketStatus', typeString+' Error closing websocket!');
            consoleLogger.error('consoleWebsocketStatus', e);
        }

        heartbeat = false;
    }

    obj.setHeartbeatCountdown = function() {
        // Set a timeout to execute in 30 seconds incase the servers
        // die and we don't get a heartbeat update
        clearTimeout(heartbeatCountdown);
        heartbeatCountdown = setTimeout(function() {
            consoleLogger.error('websocket:heartbeat', typeString+' GOT NO HEARTBEAT FROM CENSUS');

            obj.restartSocket()
        }, 45000);
    }

    obj.fireSubscriptions = function() {
        if (type === 'metagame') {
            let message = {
                service: 'event',
                action: 'subscribe',
                eventNames: ['MetagameEvent'],
                worlds: ['all']
            };
        } else {
            let message = {
                service: 'event',
                action: 'subscribe',
                eventNames: [
                    'Death',
                    'FacilityControl',
                    'GainExperience',
                    'PlayerFacilityCapture',
                    'PlayerFacilityDefend',
                    'VehicleDestroy'
                ],
                worlds: ['all']
            }
        }


        obj.sendMessage(message);
    };

    obj.sendMessage = function(message) {
        consoleLogger.success('censusSentMessages', typeString+' Sending to Census:');
        consoleLogger.success('censusSentMessages', JSON.stringify(message, null, 4));
        websocketClient.send(JSON.stringify(message));
    };

    obj.checkHeartbeat = function() {
        consoleLogger.debug('websocket:heartbeat', typeString+' Heartbeat status: '+heartbeat);
    };

    module.exports = obj;
}());
