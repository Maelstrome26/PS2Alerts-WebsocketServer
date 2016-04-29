const config = require('./config.js');

module.exports = {
  client: 'mariasql',
  connection: {
    host     : config.database.primary.host,
    user     : config.database.primary.user,
    password : config.database.primary.pass,
    db : config.database.primary.name
  }
};