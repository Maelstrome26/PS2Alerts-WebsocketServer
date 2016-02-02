'use strict';
// Websocket to census / blackfeather

const routerPush = require('../router_push.js');
const config = require('../../config.js');

let ws = require('ws');
let websocketClient;

module.exports = {
    'init': () => {
        console.log('Initializing websocket connection to Census (PC)');
        console.log('wss://push.planetside2.com/streaming?environment=ps2&service-id=s:' + config.censusServiceId);
        websocketClient = new ws('wss://push.planetside2.com/streaming?environment=ps2&service-id=s:' + config.censusServiceId);

        websocketClient.on('message', function(message) {
            routerPush.onrawmessage(message);
        });

        websocketClient.on('open', function() {
            console.log('Websocket Open!');
        });

        websocketClient.on('error', function(error) {
            console.log('Websocket Error!', JSON.stringify(error, null, 4));
        });
    },
    'pushChannels': [],
    'intChannels': [],
};
