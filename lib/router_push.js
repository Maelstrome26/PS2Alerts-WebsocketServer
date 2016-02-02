'use strict';

// DEBUG FLAGS
let SHOW_UNPARSABLE_MESSAGES = false;

// Module globals
let receivers = {};
let perfMetrics = {};

// MSG TYPES
const MessageTypes = {
    serviceMessage: "serviceMessage",
    heartbeat: "heartbeat",
    serviceStateChanged: "serviceStateChanged",
    connectionStateChanged: "connectionStateChanged"
};

const consoleLogger = require('./debugger.js');
const TAG = "ROUTER_PUSH";

function parseServiceMessage(message) {
    // Game data message, send it to all modules parsing the events
    for (let x of receivers[MessageTypes.serviceMessage]) {
        x.onmessage(message.payload);
    }
}

function parseHeartbeat(message) {
    // Online heartbeat
    // {"online":{"EventServerEndpoint_Briggs_25":"true","EventServerEndpoint_Cobalt_13":"true","EventServerEndpoint_Connery_1":"true","EventServerEndpoint_Emerald_17":"true","EventServerEndpoint_Jaeger_19":"true","EventServerEndpoint_Miller_10":"true"},"service":"event","type":"heartbeat"}
    for (let key of Object.keys(message.online)) {
        // TODO: Stop alert if server goes down?
        // console.log("Server %s online %s", key, (message.online[key]));
    }
}

function parseServiceStateChanged(message) {
    // {"detail":"EventServerEndpoint_Jaeger_19","online":"true","service":"event","type":"serviceStateChanged"}
    // TODO: Stop alert if server goes down?
    // console.log("Server %s online %s", message.detail, (message.online));
}

function parseConnectionStateChanged(message) {
    // {"connected":"true","service":"push","type":"connectionStateChanged"}
    // console.log("Service %s online %s", message.service, message.connected);
    // TODO: Handle disconnects of push messages
}

function unparsable(message) {
    // Not parsed, debug?
    if (SHOW_UNPARSABLE_MESSAGES)
        console.log("[ERROR] %s Unparsed message %j", TAG, message);
}

function increasePerfCounter(channel) {
    perfMetrics.messages++;
    perfMetrics[MessageTypes[channel]]++;
}

module.exports = {
    "onrawmessage": function (message) {
        this.onmessage(JSON.parse(message));
    },
    "onmessage": (message) => {
        consoleLogger.info(JSON.stringify(message, null, 4), 'websocketMessage');

        let channel = message.type;
        if (!MessageTypes.hasOwnProperty(channel)) {
            console.log("[ERROR] %s Invalid channel %s", TAG, channel);
            return;
        }
        increasePerfCounter(channel);

        switch (channel) {
            case MessageTypes.serviceMessage: parseServiceMessage(message); break;
            case MessageTypes.heartbeat: parseHeartbeat(message); break;
            case MessageTypes.serviceStateChanged: parseServiceStateChanged(message); break;
            case MessageTypes.connectionStateChanged: parseConnectionStateChanged(message); break;

            default: unparsable(message); break;
        }

    },
    "init": () => {
        for (let channel of Object.keys(MessageTypes)) {
            receivers[MessageTypes[channel]] = [];
            perfMetrics[MessageTypes[channel]] = 0;
        }
        perfMetrics["messages"] = 0;

        console.log("[INFO] %s Init channels! %j", TAG, receivers);
    },
    "registerReceiver": (receiver) => {

        if (receiver.hasOwnProperty("pushChannels")) {
            for (let x of receiver.pushChannels) {
                if (MessageTypes.hasOwnProperty(x)) {
                    receivers[x].push(receiver);
                } else {
                    console.log("[ERROR] %s Unable to register channel %s", TAG, x)
                }
            }
        }
    },
    "number_messages": () => { return perfMetrics["messages"] },
    "number_service_messages": () => { return perfMetrics[MessageTypes.serviceMessage] },
    "messageTypes": MessageTypes
};
