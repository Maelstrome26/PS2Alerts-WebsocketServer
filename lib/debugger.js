'use strict';

const config = require('../config.js');

module.exports = {
    'info': (message, type) => {
        if (config.debug[type] === true) {
            console.log(type, message);
        }
    }
};
