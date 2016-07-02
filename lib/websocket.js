(function () {
    'use strict';

    const config = require('../config.js');

    let ws = require('ws');
    let observer = require('node-observer');
    const consoleLogger = require('./utilities/consoleLogger.js');
    let messageRouter = require('./messageRouter.js');
    let dataManager = require('./websocketDataManager.js'); // Holds all the concurrent info going on
    let subscribeManager = require('./websocketSubscriptionManager.js');
    const _ = require('lodash');
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

    let obj = {};

    // Set up exports using passed environment, allowing re-instantiation
    module.exports = function(passedEnv) {
        environment = passedEnv;
        obj.initWebsocket(passedEnv);
        return obj;
    };

    obj.initWebsocket = function(passedEnv) {
        environment = passedEnv;
        // Set it to globally for the module so it can be passed again should it be reset
        typeString = '['+environment+']:';

        let path = 'wss://push.planetside2.com/streaming?environment='+environment+'&service-id=s:'+config.censusServiceId;

        consoleLogger.status(
            'websocket:initWebsocket',
            typeString+' Initializing websocket connection to Census ('+environment+')'
        );
        consoleLogger.status('websocket:initWebsocket', path);

        websocketClient = new ws(path);

        websocketClient.on('open', function () {
            consoleLogger.success('websocket:statusMessages', typeString+' Websocket Open!');
            heartbeat = true;

            dataManager.loadActives();

            // Subscribe to Alerts
            subscribeManager.fireMetagameSubscription();

            heartbeatInterval = setInterval(function() {
                obj.checkHeartbeat();
            }, 35000);

            obj.setHeartbeatCountdown();
            //obj.setupTestMessages();
            consoleLogger.status('websocket:heartbeat', typeString+' Heartbeat check registered');
        });

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


        websocketClient.on('error', function (error) {
           consoleLogger.error('websocket:statusMessages', typeString+' WEBSOCKET ERROR: ' + error);
           obj.restartSocket();
        });

        websocketClient.on('close', function() {
            consoleLogger.error('websocket:statusMessages', typeString+' WEBSOCKET CLOSED!');
            heartbeat = false;
        })
    };

    obj.isConnected = function() {
        consoleLogger.debug('websocket:isConnected', typeString+' Returning websocket status: ' + heartbeat)
        return heartbeat;
    }

    obj.restartSocket = function() {
        consoleLogger.error('websocket:restartSocket', typeString+' Killing websocket!', true);

        try {
            websocketClient.close();
        } catch(e) {
            consoleLogger.error('websocket:restartSocket', typeString+' Error closing websocket!');
            consoleLogger.error('websocket:restartSocket', e);
        }

        heartbeat = false;
    }

    obj.setHeartbeatCountdown = function() {
        // Set a timeout to execute in 30 seconds incase the servers
        // die and we don't get a heartbeat update
        clearTimeout(heartbeatCountdown);
        heartbeatCountdown = setTimeout(function() {
            consoleLogger.error('websocket:heartbeat', typeString+' GOT NO HEARTBEAT FROM CENSUS', true);

            obj.restartSocket()
        }, 45000);
    }

    obj.checkHeartbeat = function() {
        consoleLogger.debug('websocket:heartbeat', typeString+' Heartbeat status: '+heartbeat);
    };

    obj.setupTestMessages = function() {
        if (config.sendTestMessages) {
            // Testing function to send a series of messages for testing purposes.
            setInterval(function() {
                let messageTester = require('./messageTester.js');

                _.forEach(messageTester.messages, function(message, key) {
                    consoleLogger.debug('messageTests', 'Sending message test:');
                    consoleLogger.debug('messageTests', JSON.stringify(message, null, 4));
                    messageRouter.onMessage(JSON.stringify(message));
                });
            }, 5000)
        }
    }

    observer.subscribe(this, 'sendCensusMessage', function(who, message) {
        console.log('sendCensusMessage');
        consoleLogger.debug('websocket:censusSentMessages', typeString+' Sending to Census:');
        consoleLogger.debug('websocket:censusSentMessages', JSON.stringify(message, null, 4));
        websocketClient.send(JSON.stringify(message));
    })
}());
