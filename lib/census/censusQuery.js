(function () {
    'use strict';

    const config = require('../../config.js');
    const Promise = require('bluebird');

    // Caches player ids & names & outfit id
    const dbgcensus = require('dbgcensus');
    const censusQuery = require('dbgcensus').Query;
    const censusParser = require('./censusParser.js');
    const consoleLogger = require('../utilities/consoleLogger.js');

    function init() {
        dbgcensus.SetGlobalNamespace('ps2:v2');
        dbgcensus.SetGlobalServiceKey(config.censusServiceId);

        let throwAwayInstance = new censusQuery('character');
        Promise.promisifyAll(Object.getPrototypeOf(throwAwayInstance));
    }

    // Returns the character info
    function getCharacter(id) {
        consoleLogger.debug('censusQuery:getCharacter', 'Getting Character: ' + id);
        let query = new censusQuery('character');

        query.where('character_id').equals(id);
        query.addResolve('outfit');

        return query.getAsync();
    }

    // Returns outfit info
    function getOutfit(id) {
        consoleLogger.debug('censusQuery:getOutfit', 'Getting Outfit: ' + id);
        let query = new censusQuery('outfit');

        query.where('outfit_id').equals(id);

        return query.getAsync();
    }

    init();

    module.exports = {
        'init': init,
        'getCharacter': getCharacter,
        'getOutfit': getOutfit
    };
}());
