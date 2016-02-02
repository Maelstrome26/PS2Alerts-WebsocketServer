'use strict';
// Websocket to census / blackfeather

const routerPush = require('../router_push.js');
const config = require('../../config.js');
const extendedAPITransformer = require('../transformers/extendedAPITransformer.js');

let ws = require('ws');
let websocketClient;

module.exports = {
    'init': () => {
        console.log('Initializing websocket connection to Extended API');
        console.log('ws://push.api.blackfeatherproductions.com/?apikey=' + config.extendedAPIKey);
        websocketClient = new ws('ws://push.api.blackfeatherproductions.com/?apikey=' + config.extendedAPIKey);

        websocketClient.on('message', function(message) {
            message.type = extendedAPITransformer(message);
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
