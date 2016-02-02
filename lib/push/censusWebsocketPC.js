'use strict';
// Websocket to census / blackfeather

const routerPush = require('../router_push.js');
const config = require('../../config.js');
const consoleLogger = require('../debugger.js');

let ws = require('ws');
let websocketClient;

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

module.exports = {
    'init': () => {
        initWebsocket('ps2');
    },
    'pushChannels': [],
    'intChannels': [],
};
