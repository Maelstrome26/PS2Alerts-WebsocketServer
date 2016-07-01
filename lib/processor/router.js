(function () {
    'use strict';

    const death = require('./death.js');
    const facilityControl = require('./facilityControl.js');
    const gainExperience = require('./gainExperience.js');
    const playerFacilityCapture = require('./playerFacilityCapture.js');
    const playerFacilityDefend = require('./playerFacilityDefend.js');
    const vehicleDestroy = require('./vehicleDestroy.js');

    module.exports = {
        'onDeath': function(payload) {
            return death.parse(payload);
        },
        'onFacilityControl': function(payload) {
            return facilityControl.parse(payload);
        },
        'onGainExperience': function(payload) {
            return gainExperience.parse(payload);
        },
        'onPlayerFacilityCapture': function(payload) {
            return playerFacilityCapture.parse(payload);
        },
        'onPlayerFacilityDefend': function(payload) {
            return playerFacilityDefend.parse(payload);
        },
        'onVehicleDestroy': function(payload) {
            return vehicleDestroy.parse(payload);
        }
    };
}());
