(function () {
    'use strict';

    const config = require('./config.js');
    const consoleLogger = require('./lib/utilities/consoleLogger.js');
    const process = require('process');

    consoleLogger.info('Booting', 'Hello world!');

    let metagameSocket = {};
    let ps2Socket = {};
    //let ps2ps4euSocket = {};
    //let ps2ps4usSocket = {};

    // FIRE ZE LAZORS
    startSockets();

    function startSockets() {
        metagameSocket = require('./lib/websocket.js');
        metagameSocket.initWebsocket('ps2', 'metagame');
        //ps2Socket = require('./lib/websocket.js');
        //ps2Socket.initWebsocket('ps2', 'listener');
    }

    process.on('uncaughtException', function(err) {
        consoleLogger.critical('process', 'UNCAUGHT EXCEPTION: '+JSON.stringify(err, null, 4));
    });

    // Checks the state of each websocket to make sure it's connected. Restarts
    // them if not.
    // @todo I need to validate this is working correctly. I'm pretty sure it's not right now.
    setInterval(function() {
        consoleLogger.debug('server:websocketStatus', 'Checking websocket states');

        /*if (! ps2Socket || ps2Socket.isConnected() === false) {
            consoleLogger.error('server:websocketStatus', 'RESTARTING PS2 WEBSOCKET');
            // In theory this should destroy the websocket, and recreate it...
            ps2Socket = {}
            ps2Socket = require('./lib/websocket.js');
            ps2Socket.initWebsocket('ps2', 'metagame');
        }*/

        if (! metagameSocket || metagameSocket.isConnected() === false) {
            consoleLogger.error('server:websocketStatus', 'RESTARTING PS2 META WEBSOCKET');
            // In theory this should destroy the websocket, and recreate it...
            metagameSocket = {}
            metagameSocket = require('./lib/websocket.js');
            metagameSocket.initWebsocket('ps2', 'metagame');
        }
    }, 5000);
}());
