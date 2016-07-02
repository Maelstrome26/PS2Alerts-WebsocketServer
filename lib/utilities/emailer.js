(function () {
    'use strict';

    const nodemailer = require('nodemailer');
    const config = require('../../config.js');

    let obj = {};

    obj.sendMessage = function (message, subject) {
        return new Promise(function(resolve, reject) {
            if (! config.sendNotifyEmails) {
                console.log('Emails not configured. Not sending.');
                return resolve();
            }

            let options = {
                from:    'server@ps2alerts-server.host',
                to:      config.email.address,
                subject: subject,
                text: message
            }

            let transString = 'smtps://'+config.email.user+':'+config.email.password+'@smtp.gmail.com';
            let transporter = nodemailer.createTransport(transString);

            transporter.sendMail(options, function(error, info) {
                if (error) {
                    console.log('Email sent failed!', error);
                    reject(error);
                }

                console.log('Email successfully sent to: '+config.email.address);
                console.log('Response: '+info.response);

                resolve(true);
            });
        })
    };

    module.exports = obj;
}());
