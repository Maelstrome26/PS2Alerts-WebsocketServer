'use strict';
// Websocket to census / blackfeather

const routerPush = require('../router_push.js');
const config = require('../../config.js');
let ws = require('ws');
let websocketClient;

module.exports = {
    "onmessage": (message) => {

    },
    "init": () => {
        console.log("Initializing websocket connection to Extended API");

        let websocketClient = new ws('ws://push.api.blackfeatherproductions.com/?apikey='+config.extendedAPIKey);
    },
    "pushChannels": [],
    "intChannels": [],
};
