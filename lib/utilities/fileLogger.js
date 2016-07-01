(function () {
    'use strict';

    let path = require('path');
    let fs = require('fs');

    let obj = {};

    obj.writeToLog = function (line) {
        line += '\n';
        console.log('writing to log');
        let file = path.join(__dirname, 'output', '/../../../errors.log');
        console.log(file);
        let stream = fs.createWriteStream(file, {'flags': 'a'});
        stream.write(line);
    };

    module.exports = obj;
}());
