'use strict';

const common = require('./appCommon.js');

let ws = require('ws');
let messageRouter = require('./messageRouter.js');
let dataManager = require('./websocketDataManager.js'); // Holds all the concurrent info going on
let subscribeManager = require('./websocketSubscriptionManager.js');
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

function initWebsocket(env) {
    environment = env;
    typeString = '['+environment+']:';

    let path = 'wss://push.planetside2.com/streaming?environment='+environment+'&service-id=s:'+common.config().censusServiceId;

    common.consoleLogger().status(
        'websocket:initWebsocket',
        typeString+' Initializing websocket connection to Census ('+environment+')'
    );
    common.consoleLogger().status('websocket:initWebsocket', path);

    websocketClient = new ws(path);

    websocketClient.on('open', function () {
        common.consoleLogger().success('websocket:statusMessages', typeString+' Websocket Open!');
        heartbeat = true;

        dataManager.loadActives();

        // Subscribe to Alerts
        subscribeManager.fireMetagameSubscription();

        //setupTestMessages();
    });

    // Register event handlers
    websocketClient.on('message', function (message) {
        messageRouter.onMessage(message, function(callback) {
            // If we got a heartbeat, keep keep the variable true.
            if (callback === 'heartbeat') {
                common.consoleLogger().debug('websocket:heartbeat', typeString+' Got heartbeat');
                heartbeat = true;
            }
        });
    });


    websocketClient.on('error', function (error) {
        // Log it and email
        common.consoleLogger().error('websocket:statusMessages', typeString+' WEBSOCKET ERROR: ' + error, true);

        // Set heartbeat to false, as something is going wrong
        heartbeat = false;
    });

    websocketClient.on('close', function() {
        common.consoleLogger().error('websocket:statusMessages', typeString+' WEBSOCKET CLOSED!');
        heartbeat = false;
    });
};

function isConnected() {
    common.consoleLogger().debug('websocket:heartbeat', typeString+' Heartbeat status: '+heartbeat);
    return heartbeat;
}

function restartSocket() {
    return new Promise(function(resolve, reject) {
        common.consoleLogger().error('websocket:restartSocket', typeString+' Killing websocket!', true);

        subscribeManager.clearSubscriptions();
        try {
            websocketClient.close();
        } catch(e) {
            common.consoleLogger().error('websocket:restartSocket', typeString+' Error closing websocket!');
            common.consoleLogger().error('websocket:restartSocket', e);
        }

        resolve();
    });
}

function setupTestMessages() {
    if (config.sendTestMessages) {
        // Testing function to send a series of messages for testing purposes.
        setInterval(function() {
            let messageTester = require('./messageTester.js');

            common.lodash().forEach(messageTester.messages, function(message, key) {
                common.consoleLogger().debug('messageTests', 'Sending message test:');
                common.consoleLogger().debug('messageTests', JSON.stringify(message, null, 4));
                messageRouter.onMessage(JSON.stringify(message));
            });
        }, 5000)
    }
}

common.observer().subscribe(this, 'sendCensusMessage', function(who, message) {
    common.consoleLogger().debug('events', 'Send Census Event Received');
    common.consoleLogger().debug('websocket:censusSentMessages', typeString+' Sending to Census:');
    common.consoleLogger().debug('websocket:censusSentMessages', JSON.stringify(message, null, 4));
    websocketClient.send(JSON.stringify(message));
});

// Set up exports using passed environment, allowing re-instantiation
module.exports = function(env) {
    let websocketModule = {
        initWebsocket: initWebsocket,
        isConnected: isConnected,
        restartSocket: restartSocket
    }

    initWebsocket(env);

    return websocketModule;
};
