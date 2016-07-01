'use strict';

// Copy this to file 'config.user.js' and change the below to suit.

module.exports = {
    censusServiceId: 'example',
    extendedAPIKey: 'example',
    serverPort: 1234,
    database: {
        primary: {
            host: 'some.host.com',
            user: 'someuser',
            pass: 'somepassword',
            name: 'somedbname'
        },
        cache: {
            host: 'some.host.com',
            user: 'someuser',
            pass: 'somepassword',
            name: 'somedbname'
        }
    },
    redis: {
        host: 'somehost',
        port: 1234,
        db: 0
    }
}
