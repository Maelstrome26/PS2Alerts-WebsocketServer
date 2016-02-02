'use strict';

console.log("Starting collector");

const routerPush = require('../lib/router_push.js');
const routerInt = require('../lib/router_internal.js');
const pf = require('../lib/parsers/parser_facilities.js');
const pws = require('../lib/push/push_websocket.js');

console.log("Importing modules [done]");


// let cp = new CombatParser();
let modules = [pf];

let messages = [
    {"payload":{"duration_held":"7679","event_name":"FacilityControl","facility_id":"293000","new_faction_id":"3","old_faction_id":"3","timestamp":"1405291671","world_id":"10","zone_id":"4"},"service":"event","type":"serviceMessage"},
    {"payload":{"duration_held":"108","event_name":"FacilityControl","facility_id":"310088","new_faction_id":"1","old_faction_id":"3","timestamp":"1405291709","world_id":"10","zone_id":"282198111"},"service":"event","type":"serviceMessage"},
    {"payload":{"duration_held":"18249","event_name":"FacilityControl","facility_id":"264000","new_faction_id":"1","old_faction_id":"1","timestamp":"1405291728","world_id":"10","zone_id":"4"},"service":"event","type":"serviceMessage"},
    {"payload":{"duration_held":"122","event_name":"FacilityControl","facility_id":"310088","new_faction_id":"1","old_faction_id":"3","timestamp":"1405291733","world_id":"10","zone_id":"282263647"},"service":"event","type":"serviceMessage"},
    {"payload":{"duration_held":"1405291744","event_name":"FacilityControl","facility_id":"310612","new_faction_id":"1","old_faction_id":"0","timestamp":"1405291744","world_id":"10","zone_id":"282329183"},"service":"event","type":"serviceMessage"},
    {"payload":{"duration_held":"0","event_name":"FacilityControl","facility_id":"310612","new_faction_id":"3","old_faction_id":"1","timestamp":"1405291744","world_id":"10","zone_id":"282329183"},"service":"event","type":"serviceMessage"},
    {"payload":{"duration_held":"1405291744","event_name":"FacilityControl","facility_id":"310088","new_faction_id":"3","old_faction_id":"0","timestamp":"1405291744","world_id":"10","zone_id":"282329183"},"service":"event","type":"serviceMessage"},
    {"payload":{"duration_held":"2210","event_name":"FacilityControl","facility_id":"222380","new_faction_id":"3","old_faction_id":"3","timestamp":"1405291761","world_id":"10","zone_id":"6"},"service":"event","type":"serviceMessage"}
];

routerPush.init();
routerInt.init();

// Try to register all modules
for(let m of modules){
    routerPush.registerReceiver(m);
    routerInt.registerReceiver(m);    
}

// Register the push websocket module
pws.init();

// for(let i = 0; i < messages.length; ++i) {
//     routerPush.onmessage(messages[i]);
// }


// var lineReader = require('readline').createInterface({
//   input: require('fs').createReadStream('input1.txt')
// });

// lineReader.on('line', function (line) {
//     routerPush.onrawmessage(line);
// });

// lineReader.on('close', function(){
//     console.log(`Number of service messages: ${routerPush.number_service_messages()} / ${routerPush.number_messages()}`);    
// });

