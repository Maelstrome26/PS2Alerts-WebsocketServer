(function () {
    'use strict';

    let path = require('path');
    let fs = require('fs');

    module.exports = {
        'writeToLog': function (line) {
            line += '\n';
            let file = path.join(__dirname, 'output', '/../../../errors.log');
            let stream = fs.createWriteStream(file, {'flags': 'a'});
            stream.write(line);
        }
    };
}());
