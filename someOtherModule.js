"use strict"

let observer = require("node-observer");

let obj = {};

obj.run = function() {
    observer.send(obj, 'testAgain', 'Hello from some other module');
}

module.exports = obj;
