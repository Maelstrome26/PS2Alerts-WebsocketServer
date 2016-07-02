"use strict"

let observer = require("node-observer");
let someOtherModule = require('./someOtherModule.js');

let obj = {};

obj.test = function() {
    console.log('test');

    observer.send(obj, 'test', 'Hello world again!');

    someOtherModule.run();
}

module.exports = obj;
