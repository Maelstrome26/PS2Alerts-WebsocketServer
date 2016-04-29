'use strict';

// EXAMPLE USAGE

// Knex query
// database.knex.insert([{ outfit: 'DIG' }, { outfit: 'DIGT' }], 'resultID').into('ws_events')
//     .then(function (obj) {
//         console.log("Insert ID %d", obj);
//     });



const config = require('../config.js');  
const knex  = require('knex')({
  //  debug: true,
  client: 'mariasql',
  connection: {
    host     : config.database.primary.host,
    user     : config.database.primary.user,
    password : config.database.primary.pass,
    db : config.database.primary.name
  },
  migrations: {
    tableName: 'migrations'
  }
});

knex.migrate.latest()
//.then(function() {
  //return knex.seed.run();
//})
.then(function() {
  const consoleLogger = require('./debugger.js');
  const TAG = "DATABASE";
  
  consoleLogger.info(TAG, "Migrations successfully applied");
});

const bookshelf = require('bookshelf')(knex);
module.exports = bookshelf;