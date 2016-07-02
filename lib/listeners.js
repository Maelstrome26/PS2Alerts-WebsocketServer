// Collation of modules that are listening for events triggering. We're loading them all so that
// the listeners are subscribed and ready to go.

(function () {
    'use strict';

    const config = require('../config.js');
    let observer = require('node-observer');

    // Listening classes
    const redisClient = require('./stores/redisClient.js');

    let obj = {};

    module.exports = obj;
}());
