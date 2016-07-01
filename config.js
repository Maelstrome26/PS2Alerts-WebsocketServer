(function () {
    'use strict';

    const userconfig = require('./config.user.js');

    let config = {
        censusServiceId: userconfig.censusServiceId,
        extendedAPIKey: userconfig.extendedAPIKey,
        serverPort: userconfig.serverPort,
        database : userconfig.database,
        redis: userconfig.redis,
        allowedDebug: [ // Debug message keys that are allowed to be shown
            'websocket:heartbeat',
            //'messageProcessor:executePlayerUpdate'
        ],
        statusMessages: {
            census: true
        },
        supplementalConfig: {
            worlds : {
                1: 'Connery',
                10: 'Miller',
                13: 'Cobalt',
                17: 'Emerald',
                19: 'Jaeger',
                25: 'Briggs',
                1000: 'Genudine (PS4US)',
                1001: 'Palos (PS4US)',
                1002: 'Crux (PS4US)',
                1003: 'Searhus (PS4US)',
                1004: 'Xelas (PS4US)',
                2000: 'Ceres (PS4EU)',
                2001: 'Lithcorp (PS4EU)',
                2002: 'Rashnu (PS4EU)'
            },
            pcWorlds: [1,10,13,17,25],
            ps4usWorlds: [1000, 1001],
            ps4euWorlds: [2000, 2001],
        },
        events: [// All events we're going to monitor
            'Death',
            'GainExperience',
            'MetagameEvent',
            'PlayerFacilityCapture',
            'PlayerFacilityDefend',
            'VehicleDestroy'
        ]
    };

   module.exports = config;
}());
