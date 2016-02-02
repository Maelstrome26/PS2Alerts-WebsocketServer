'use strict';

// client
//var ws = new WebSocket('wss://0.0.0.0:8443');
// ws.send('foo');
    
// Setup socket to all website visitors

const https = require('https');
const fs = require('fs');

//var express = require('express');
//var app = express();

//... bunch of other express stuff here ...
  var processRequest = function( req, res ) {

        res.writeHead(200);
        res.end("All glory to WebSockets!\n");
    };


const options = {
  key: fs.readFileSync('sslcert/dev-key.pem', 'utf8'),
  cert: fs.readFileSync('sslcert/dev-cert.pem', 'utf8')
};

const httpsServer = https.createServer(options, (req, res) => {
  res.writeHead(200);
  res.end('hello world\n');
}).listen(8443);


var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({
    server: httpsServer
});

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
    });

    ws.send('something');
});

wss.on('error', function(error){
   console.log("err %j", error); 
});
    
    