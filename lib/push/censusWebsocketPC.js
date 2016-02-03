'use strict';
// Websocket to census

const routerPush = require('../router_push.js');
const config = require('../../config.js');
const consoleLogger = require('../debugger.js');

let ws = require('ws');
let websocketClient;

let subscriptions = {
    MetagameEvent: false, // We'll only be subscribing globally
    Death: {
        1: false,
        10: false,
        13: false,
        17: false,
        19: false,
        25: false
    },
    FacilityControl: {
        1: false,
        10: false,
        13: false,
        17: false,
        19: false,
        25: false
    },
    GainExperience: {
        1: false,
        10: false,
        13: false,
        17: false,
        19: false,
        25: false
    }
}

function initWebsocket(environment) {
    let path = 'wss://push.planetside2.com/streaming?environment=' + environment + '&service-id=s:' + config.censusServiceId;
    consoleLogger.info('Initializing websocket connection to Census (' + environment + ')', 'censusEvents');
    consoleLogger.info(path, 'censusEvents');

    websocketClient = new ws(path);

    // Register event handlers
    websocketClient.on('message', function (message) {
        routerPush.onrawmessage(message);
    });

    websocketClient.on('open', function () {
        consoleLogger.status('Websocket Open!', 'censusEvents');
        fireMetagameSubscriptions();
    });

    websocketClient.on('error', function (error) {
        consoleLogger.error(error, 'censusEvents');

        websocketClient = null; // Destroy the websocket instance
        setTimeout(function() {
            consoleLogger.info('Reconnecting websocket...', 'censusEvents');
            initWebsocket(environment);
        }, 5000);
    });
};

function sendMessage(message) {
    websocketClient.send(JSON.stringify(message));
}

function fireMetagameSubscriptions() {
    console.log('bewbs');
    for (var key in config.supplementalConfig.pcWorlds) {
        let world = String(config.supplementalConfig.pcWorlds[key]);
        let message = {
        	"service":"event",
        	"action":"subscribe",
        	"eventNames":["MetagameEvent"],
            "worlds" : [world] // Has to be like this for census to pick it up
        };

        consoleLogger.info('Firing MetagameEvent Subscription - World: ' + world, 'censusEvents');

        sendMessage(message);
    }
}

module.exports = {
    'init': () => {
        initWebsocket('ps2');
    },
    'sendMessage': (message) => {
        sendMessage(message);
    },
    'pushChannels': [],
    'intChannels': [],
};
