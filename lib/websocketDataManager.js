(function () {
    'use strict';

    let observer = require('node-observer');
    const moment = require('moment');
    const alertParser = require('./parser/alert.js');
    const consoleLogger = require('./utilities/consoleLogger.js');
    const redisClient = require('./stores/redisClient.js');
    const _ = require('lodash');

    let obj = {};

    let activeAlerts = {};

    // Loads actives from Redis
    obj.loadActives = function() {
        redisClient.get('activeAlerts').then(function(data) {
            if (data) {
                activeAlerts = data;
                let count = _.size(activeAlerts);
                consoleLogger.success('websocketDataManager:loadActives', 'Actives loaded! '+count+' alerts found.');

                obj.subscribeToActives();
            }
        });
    }

    obj.subscribeToActives = function() {
        _.forEach(activeAlerts, function(value, key) {
            observer.send(this, 'subscribeStreams', {
                world: value.world,
                zone: value.zone
            });
        });
    }

    obj.getActives = function() {
        return activeAlerts;
    }

    obj.checkActives = function(world) {
        let found = _.filter(activeAlerts, {'world': world});

        if (found.length > 1) {
            consoleLogger.error('websocket:fireSubscriptions', 'Found more than 1 alert on world '+world, true);
        }

        if (found.length !== 0) {
            return true;
        }

        return false;
    }

    obj.addActive = function(alert) {
        /* Expects:
        {
            id,
            world,
            zone,
            started,
            ends
        }
        */
        activeAlerts[alert.id] = alert;

        console.log(activeAlerts);

        consoleLogger.status('websocketDataManager:addActive', 'Added alert on W:'+alert.world+' - Z:'+alert.zone);
        consoleLogger.debug('websocketDataManager:addActive', JSON.stringify(activeAlerts, null, 4));

        // Send a copy of the actives array to Redis incase the script has to be restarted
        observer.send(this, 'redisSet', {
            key: 'activeAlerts',
            value: JSON.stringify(activeAlerts)
        });
    };

    obj.endActive = function(alert) {
        delete obj.activeAlerts[alert.id];

        observer.send(this, 'redisSet', {
            key: 'activeAlerts',
            value: JSON.stringify(activeAlerts)
        });

        consoleLogger.debug('websocketDataManager:endActive', 'Removed alert on W:'+alert.world_id+' - Z:'+alert.zone);
    }

    observer.subscribe(this, 'insertedAlert', function(who, payload) {
        consoleLogger.debug('websocketDataManager:events', 'Detected insertedAlert event');
        let alertToAdd = alertParser.parseFromInsertAlert(payload);

        // Add the expected end time based on type - Currently just 1.5 hours
        if (payload.metagame_event_id <= 4) {
            let date = new moment();
            let ends = date.add({
                hours: 1,
                minutes: 30
            });

            alertToAdd.ends = parseInt(ends.format('X'));
        }

        obj.addActive(alertToAdd);

        // Send event to subscriber module
        observer.send(this, 'subscribeStreams', {
            world: alertToAdd.world,
            zone: alertToAdd.zone
        });
    });

    observer.subscribe(this, 'endedAlert', function(who, alert) {
        consoleLogger.debug('websocketDataManager:events', 'Detected endedAlert event');
        obj.endAlert(alert);

        observer.send(this, 'unsubscribeStreams', {
            world: alert.world,
            zone: alert.zone
        });
    })

    module.exports = obj;
}());
