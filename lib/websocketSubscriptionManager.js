(function () {
    'use strict';

    let observer = require('node-observer');
    const moment = require('moment');
    let dataManager = require('./websocketDataManager');
    const consoleLogger = require('./utilities/consoleLogger.js');

    let obj = {};

    let subscriptions = {};

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

    obj.subscribe = function(world) {
        // First check if the world has an active alert on it to validate we're subscribing properly

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

            subscriptions[world] = true;

            consoleLogger.status('websocketSubscriptionManager:subscribe', 'Subscribing for events on world: '+world);
            observer.send(this, 'sendCensusMessage', message);
        } else {
            consoleLogger.error('websocketSubscriptionManager:subscribe', 'Couldn\'t find an alert for world: '+world, true);
        }
    }

    obj.unsubscribe = function(world) {
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

            subcriptions[world] = null;

            consoleLogger.status('websocketSubscriptionManager:unsubscribe', 'Unsubscribing from events on world: '+world);
            observer.send(this, 'sendCensusMessage', message);
        }
    }

    // Clears all subscriptions so we can exit the websocket cleanly
    obj.clearSubscriptions = function() {
        consoleLogger.warning('websocketSubscriptionManager:clearSubscriptions', 'Clearing ALL subscriptions!');
        subscriptions = {};
    }

    observer.subscribe(this, 'subscribeStreams', function(who, data) {
        consoleLogger.debug('events', 'Subscribe Streams Event');
        obj.subscribe(data.world);
    });

    observer.subscribe(this, 'unsubscribeStreams', function(who, data) {
        consoleLogger.debug('events', 'Unsubscribe Streams Event');
        obj.unsubscribe(data.world);
    });

    observer.subscribe(this, 'clearSubscriptions', function(who, data) {
        consoleLogger.debug('events', 'Clear Subscriptions Event');
        obj.clearSubscriptions(data.world);
    });

    module.exports = obj;
}());
