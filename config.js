'use strict';

const userconfig = require('./config.user.js');

let config = {
    censusServiceId: userconfig.censusServiceId,
    extendedAPIKey: userconfig.extendedAPIKey,
    serverPort: userconfig.serverPort,
    database : userconfig.database,
    toggles : {

    },
    debug: {
        censusEvents: true,
        websocketMessage: true
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
        }
    }
};

module.exports = config;
