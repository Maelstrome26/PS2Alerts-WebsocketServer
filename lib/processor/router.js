(function () {
    'use strict';

    const death = require('./death.js');
    const facilityControl = require('./facilityControl.js');
    const gainExperience = require('./gainExperience.js');
    const metagameEvent = require('./metagameEvent.js');
    const playerFacilityCapture = require('./playerFacilityCapture.js');
    const playerFacilityDefend = require('./playerFacilityDefend.js');
    const vehicleDestroy = require('./vehicleDestroy.js');

    module.exports = {
        'onDeath': function(payload) {
            return death.process(payload);
        },
        'onFacilityControl': function(payload) {
            return facilityControl.process(payload);
        },
        'onGainExperience': function(payload) {
            return gainExperience.process(payload);
        },
        'onMetagameEvent': function(payload) {
            return metagameEvent.process(payload);
        },
        'onPlayerFacilityCapture': function(payload) {
            return playerFacilityCapture.process(payload);
        },
        'onPlayerFacilityDefend': function(payload) {
            return playerFacilityDefend.process(payload);
        },
        'onVehicleDestroy': function(payload) {
            return vehicleDestroy.process(payload);
        }
    };
}());
