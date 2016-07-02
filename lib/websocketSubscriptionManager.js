(function () {
    'use strict';

    let observer = require('node-observer');
    const moment = require('moment');
    let dataManager = require('./websocketDataManager');
    const consoleLogger = require('./utilities/consoleLogger.js');

    let obj = {};

    obj.fireMetagameSubscription = function() {
        consoleLogger.status('censusSentMessages', 'Firing MetagameEvent Message');
        let message = {
            service: 'event',
            action: 'subscribe',
            eventNames: ['MetagameEvent'],
            worlds: ['all']
        };

        observer.send(this, 'sendCensusMessage', message);
    };

    obj.fireSubscriptions = function(world) {
        // First check if the world has an active alert on it to validate we're subscribing properly

        console.log('subManActives', dataManager.getActives());

        if (dataManager.checkActives(world)) {
            let message = {
                service: 'event',
                action: 'subscribe',
                eventNames: [
                    'Death',
                    'FacilityControl',
                    'GainExperience',
                    'PlayerFacilityCapture',
                    'PlayerFacilityDefend',
                    'VehicleDestroy'
                ],
                worlds: [world],
                characters: ['all']
            };

            consoleLogger.status('websocketSubscriptionManager:fireSubscriptions', 'Subscribing for events on world: '+world);
            observer.send(this, 'sendCensusMessage', message);
        } else {
            consoleLogger.error('websocketSubscriptionManager:fireSubscriptions', 'Couldn\'t find an alert for world: '+world, true);
        }
    }

    obj.fireUnsubscriptions = function(world) {
        if (dataManager.checkActives(world)) {

        }
    }

    observer.subscribe(this, 'subscribeStreams', function(who, data) {
        console.log('Subscribe Streams Event');
        obj.fireSubscriptions(data.world);
    });


    module.exports = obj;
}());
