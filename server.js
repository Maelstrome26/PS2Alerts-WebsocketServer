(function () {
    'use strict';

    const config = require('./config.js');
    const consoleLogger = require('./lib/utilities/consoleLogger.js');

    consoleLogger.info('Booting', 'Hello world!');

    let ps2Socket = {};
    let ps2ps4euSocket = {};
    let ps2ps4usSocket = {};

    startSockets();

    function startSockets() {
        ps2Socket = require('./lib/websocket.js');
        ps2Socket.initWebsocket('ps2');
    }

    // Checks the state of each websocket to make sure it's connected. Restarts
    // them if not.
    setInterval(function() {
        consoleLogger.debug('server:websocketStatus', 'Checking websocket states');

        if (ps2Socket.isConnected() === false) {
            consoleLogger.error('server:websocketStatus', 'RESTARTING PS2 WEBSOCKET');
            ps2Socket = {}
            ps2Socket = require('./lib/websocket.js');
            ps2Socket.initWebsocket('ps2');
        }
    }, 5000);
}());
