'use strict';

module.exports = {
    censusServiceId: 'example',
    extendedAPIKey: 'example',
    serverPort: 1337,
    database : {
        primary : {
            host: '123.456.789.0',
            user: 'dbUser',
            pass: 'dbPass',
            name: 'dbname'
        },
        cache : {
            host: '123.456.789.0',
            user: 'dbUser',
            pass: 'dbPass',
            name: 'dbname'
        }
    }
};
