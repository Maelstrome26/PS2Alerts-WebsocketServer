'use strict';

let receivers = [];

// DEBUG FLAGS
let SHOW_UNPARSABLE_MESSAGES = false;

// PERFORMACE METRICS
let perf_number_messages = 0;
let perf_number_service_messages = 0;
let perf_number_heartbeat_messages = 0;
let perf_number_serviceState_messages = 0;
let perf_number_connectionState_messages = 0;

// MSG TYPES
const messageTypes = {
    serviceMessage: "serviceMessage",
    heartbeat: "heartbeat",
    serviceStateChanged: "serviceStateChanged",
    connectionStateChanged: "connectionStateChanged"
};

function parseServiceMessage(message) {
    perf_number_service_messages++;
    
    // Game data message, send it to all modules parsing the events
    for (let x of receivers) {
        x.onmessage(message.payload);
    }    
}

function parseHeartbeat(message) {
    perf_number_heartbeat_messages++;
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
        console.log("[ERROR] Unparsed message %j", message);
}

module.exports = {
    "onrawmessage": function (message) {
        this.onmessage(JSON.parse(message));
    },
    "onmessage": function (message) {
        perf_number_messages++;
    
        // Filter payload messages
            switch (message.module) {
                case "serviceMessage": parseServiceMessage(message); break;
                case "heartbeat": parseHeartbeat(message); break;
                case "serviceStateChanged": parseServiceStateChanged(message); break;
                case "connectionStateChanged": parseConnectionStateChanged(message); break;

                default: unparsable(message); break;
            }
    },
    "init": () => {
        
    },
    "registerReceiver": (receiver) => {},
    "number_messages": function () {
        return perf_number_messages;
    },
    "number_service_messages": function () {
        return perf_number_service_messages;
    },
    "messageTypes": {
        al: "a"
    }
};