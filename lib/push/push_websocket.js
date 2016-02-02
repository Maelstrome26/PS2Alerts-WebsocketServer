// Websocket to census / blackfeather

const routerPush = require('../router_push.js');
 
    
module.exports = {
    "onmessage": (message) => {

    },
    "init": () => {
        console.log("Hi! This is push websocket!");
        
        // Send a dummy message as example
        routerPush.onmessage({"payload":{"duration_held":"7679","event_name":"FacilityControl","facility_id":"293000","new_faction_id":"3","old_faction_id":"3","timestamp":"1405291671","world_id":"10","zone_id":"4"},"service":"event","type":"serviceMessage"});
    },
    "pushChannels": [],
    "intChannels": [],
};