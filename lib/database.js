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


knex.select('name').from('users')
  .where('id', '>', 20)
  .andWhere('id', '<', 200)
  .limit(10)
  .then(function(rows) {
    return _.pluck(rows, 'name');
  })
  .then(function(names) {
    return knex.select('id').from('nicknames').whereIn('nickname', names);
  })
  .then(function(rows) {
    console.log(rows);
  })
  .catch(function(error) {
    console.error(error)
  });

const bookshelf = require('bookshelf')(knex);
module.exports = bookshelf;