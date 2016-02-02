'use strict';

const routerPush = require('../router_push.js');
const pushMessageTypes = routerPush.messageTypes;
const intMessageTypes = require('../router_internal.js').messageTypes;

let number_messages = 0;
let number_filter_messages = 0;

module.exports = {
    "onmessage": function (message) {
        number_messages++;
    
        // Filter alert messages
        if (message.event_name == "FacilityControl") {
            number_filter_messages++;
            // {"duration_held":"13300","event_name":"FacilityControl","facility_id":"228","new_faction_id":"3","old_faction_id":"1","outfit_id":"0","timestamp":"1453468524","world_id":"17","zone_id":"2"}
            
            console.log("Got facility message %j", message);
        }
   
    },
    "number_messages": function(){
        return number_messages;
    },
    "number_filter_messages": function(){
        return number_filter_messages;
    },
    "nnumber_messages": function(){
        number_messages++;
    },
    "pushChannels": [pushMessageTypes.serviceMessage],
    "intChannels": [],
};

