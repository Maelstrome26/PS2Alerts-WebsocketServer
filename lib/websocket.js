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

    obj.initWebsocket = function(passedEnv) {
        // Set it to globally for the module so it can be passed again should it be reset
        environment = passedEnv;

        let path = 'wss://push.planetside2.com/streaming?environment=' + environment + '&service-id=s:' + config.censusServiceId;
        consoleLogger.status('censusWebsocketStatus', 'Initializing websocket connection to Census (' + environment + ')');
        consoleLogger.status('censusWebsocketStatus', path);

        websocketClient = new ws(path);

        // Register event handlers
        websocketClient.on('message', function (message) {
            messageRouter.onMessage(message, function(callback) {
                // If we got a heartbeat, keep keep the variable true.
                if (callback === 'heartbeat') {
                    consoleLogger.debug('websocket:heartbeat', 'Got heartbeat');

                    heartbeat = true;

                    obj.setHeartbeatCountdown();
                }
            });
        });

        websocketClient.on('open', function () {
            consoleLogger.success('censusWebsocketStatus', 'Websocket Open!');
            heartbeat = true;
            obj.fireSubscriptions();

            heartbeatInterval = setInterval(function() {
                obj.checkHeartbeat();
            }, 35000);
            obj.setHeartbeatCountdown();
            consoleLogger.status('websocket:heartbeat', 'Heartbeat check registered');
        });

        websocketClient.on('error', function (error) {
           consoleLogger.error('censusWebsocketStatus', 'WEBSOCKET ERROR: ' + error);
           obj.restartSocket();
        });

        websocketClient.on('close', function() {
            consoleLogger.error('censusWebsocketStatus', 'WEBSOCKET CLOSED!');
            heartbeat = false;
        })
    };

    obj.isConnected = function() {
        consoleLogger.debug('server:websocketStatus', 'Returning websocket status: ' + heartbeat)
        return heartbeat;
    }

    obj.restartSocket = function() {
        consoleLogger.error('censusWebsocketStatus', 'Killing websocket!');

        try {
            websocketClient.close();
        } catch(e) {
            consoleLogger.error('consoleWebsocketStatus', 'Error closing websocket!');
            consoleLogger.error('consoleWebsocketStatus', e);
        }

        heartbeat = false;
    }

    obj.setHeartbeatCountdown = function() {
        // Set a timeout to execute in 30 seconds incase the servers
        // die and we don't get a heartbeat update
        clearTimeout(heartbeatCountdown);
        heartbeatCountdown = setTimeout(function() {
            consoleLogger.error('websocket:heartbeat', 'GOT NO HEARTBEAT FROM CENSUS');

            obj.restartSocket()
        }, 45000);
    }

    obj.fireSubscriptions = function() {
        let message = {
            service: 'event',
            action: 'subscribe',
            eventNames: ['GainExperience'],
        };

        if (config.debugCharacters) {
            message.characters = config.debugCharacters
        } else {
            message.characters = ['all'];
        }

        obj.sendMessage(message);
    };

    obj.sendMessage = function(message) {
        consoleLogger.success('censusSentMessages', 'Sending to Census:');
        consoleLogger.success('censusSentMessages', JSON.stringify(message, null, 4));
        websocketClient.send(JSON.stringify(message));
    };

    obj.checkHeartbeat = function() {
        consoleLogger.debug('websocket:heartbeat', 'Heartbeat status: ' + heartbeat);
    };

    module.exports = obj;
}());
