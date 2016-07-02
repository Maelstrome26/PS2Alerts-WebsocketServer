'use strict';

// Copy this to file 'config.user.js' and change the below to suit.

module.exports = {
    censusServiceId: 'example',
    extendedAPIKey: 'example',
    serverPort: 1234,
    email: {
        // Only Gmail is supported! Leave fields blank if you don't want emails.
        // If you have issues with gmail, read: http://nodemailer.com/using-gmail/
        address: 'someemail@somehost.com', // The address you want emails to go to
        user: 'someemail@gmail.com', // Your Gmail username
        password: 'somepassword' // Your Gmail password
    },
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
