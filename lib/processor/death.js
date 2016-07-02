(function () {
    'use strict';

    const common = require('./common.js');
    let obj = {};

    obj.process = function(payload) {
        //common.consoleLogger().status('Death: got message');
    };

    module.exports = obj;
}());
