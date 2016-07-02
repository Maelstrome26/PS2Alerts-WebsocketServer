(function () {
    'use strict';

    const common = require('./common.js');
    let obj = {};
    let db = common.db();
    let observer = require('node-observer');

    let translateEventIdToZone = {
        1: 2, // Indar
        2: 8, // Esamir
        3: 6, // Amerish
        4: 4 // Hossin
    };

    const tableName = 'ws_results';

    obj.process = function(payload) {
        common.consoleLogger().status('metagameEventParser:process', 'Got message!');

        let type = payload.metagame_event_state_name;

        if (type === 'started') {
            obj.insertAlert(payload);
        }
    };

    obj.insertAlert = function(payload) {
        let world = parseInt(payload.world_id);
        let zone = translateEventIdToZone[payload.metagame_event_id];
        common.consoleLogger().status('metagameEventParser:insertAlert', 'Inserting Alert for W: '+world+' - Z:'+zone);

        let date = new common.moment();
        payload.resultStartTime = date.utc().format('X');
        payload.resultDateTime = date.utc().format('YYYY-MM-DD HH:mm:ss');
        payload.resultTimeType = obj.getTimeType(date, payload);
        payload.zone = zone;

        let queryObject = common.objectFactory().alert(payload);
        let insertObject = common.queryBuilder().buildInsertObject(queryObject);
        let resultID = null;

        db.insert(insertObject).into(tableName)
        .then(function(result) {
            console.log(result);
            resultID = result[0];
            common.consoleLogger().success('metagameEventParse:insertAlert', 'Successfully inserted alert! ID:'+resultID);

            payload.id = resultID;
            // Emit event so that the websocket server picks it up and updates the active alerts data object
            observer.send(this, 'insertedAlert', payload);
        })
        .catch(function(error) {
            common.consoleLogger().critical('metagameEventParse:insertAlert', 'ALERT INSERTION ERROR! '+error);
        });

    }

    obj.getTimeType = function(moment, payload) {
        let world = parseInt(payload.world_id);

        let PST = 'America/Los_Angeles';
        let CDT = 'America/Swift_Current';
        let EST = 'America/New_York';
        let CEST = 'Europe/Paris';
        let AEST = 'Australia/Brisbane';

        let timezone = 'UTC';

        // Calculate hour offset
        if (world == 1) { // Connery
           timezone = PST;
        } else if (world == 10) { // Miller
           timezone = CEST; // Central European Standard time
        } else if (world == 13) { // Cobad
           timezone = CEST; // Central European Standard time
        } else if (world == 17) { // Emerald
           timezone = EST; // Eastern Standard time
        } else if (world == 25) { // Briggs
           timezone = AEST; // Aussie Eastern Time
        } else if (world >= 2000 ) {
           timezone = CEST; // Central European Standard time
        } else if (world >= 1000 ) {
           timezone = CDT; // Central Standard Time
        }

        let now = new Date().getTime();

        let hour = moment.tz(now, timezone).format('HH');
        let dow = moment().format('E');

        let mor = 0;
        let aft = 12;
        let pri = 17;
        let bracket = 'UNK';

        // If Friday or Saturday, change the prime bracket to suit longer playing times
        // Primes:
        // Friday: 17 - 02
        // Saturday: 15 - 02
        // Sunday: 15 - 00
        if (dow == 5 || dow == 6) {
            mor = 2;
        }

        // Change Primary on Saturday and Sunday to 3pm
        if (dow == 6 || dow == 7) {
            pri = 15;
        }

        if (hour >= mor && hour < aft) {
            bracket = 'MOR';
        }
        if (hour >= aft && hour < pri) {
            bracket = 'AFT';
        }
        if (hour >= pri && hour < mor) {
            bracket = 'PRI';
        }

        return bracket;
    }

    module.exports = obj;
}());
