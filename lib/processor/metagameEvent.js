(function () {
    'use strict';

    const common = require('./common.js');
    let obj = {};
    let db = common.db();

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

        let date = moment();

        let insert = {
            instanceID: payload.instance_id,
            ResultStartTime: date.format('U'),
            ResultDateTime: date.format('YYYY-MM-DD HH:mm:ss'),
            ResultServer: payload.world_id,
            ResultTimeType: timeType,
            ResultAlertCont: zone,
            ResultAlertType: payload.metagame_event_id,
            Valid: 1,
            InProgress: 1
        };

        let result = db(tableName).insert(insert);
        if (result[0] == 1) {
            common.consoleLogger().success('metagameEventParse:insertAlert', 'Successfully inserted alert!');
        } else {
            common.consoleLogger().critical('metagameEventParse:insertAlert', 'ALERT INSERTION ERROR!');
        }
    }

    module.exports = obj;
}());
