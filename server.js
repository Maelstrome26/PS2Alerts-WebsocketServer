(function () {
    'use strict';

    const config = require('./config.js');
    const consoleLogger = require('./lib/utilities/consoleLogger.js');
    const process = require('process');
    const websocketClient = require('./lib/websocket.js');

    consoleLogger.info('Booting', 'Hello world!');

    let ps2Socket;

    // FIRE ZE LAZORS
    startSockets();

    function startSockets() {
        ps2Socket = new websocketClient('ps2');
    }

    process.on('uncaughtException', function(err) {
        consoleLogger.critical('process', 'UNCAUGHT EXCEPTION: '+err.stack);
    });

    // Checks the state of each websocket to make sure it's connected. Restarts
    // them if not.
    // @todo I need to validate this is working correctly. I'm pretty sure it's not right now.
    let heartbeatInterval = setInterval(function() {
        consoleLogger.debug('server:websocketStatus', 'Checking websocket states');

        if (! ps2Socket || ps2Socket.isConnected() === false) {
            consoleLogger.error('server:websocketStatus', 'RESTARTING PS2 WEBSOCKET');
            // In theory this should destroy the websocket, and recreate it...
            ps2Socket.restartSocket().then(function() {
                console.log('Webocket cleanly exited!');
                ps2Socket = {}

                setTimeout(function() {
                    ps2Socket = new websocketClient('ps2');
                }, 2500);
            });
        }
    }, 15000);
}());
