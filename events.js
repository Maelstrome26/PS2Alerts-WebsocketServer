"use strict";

let observer = require('node-observer');
let someModule = require('./someModule.js');

observer.subscribe(this, "test", function(who, data) {
    console.log(data);
});

observer.subscribe(this, "testAgain", function(who, data) {
    console.log(data);
});

someModule.test();
