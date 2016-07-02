(function () {
    'use strict';

    let obj = {};

    obj.alert = function(payload) {
        let object = {
            instanceID: {
                value: payload.instance_id
            },
            ResultStartTime: {
                value: payload.resultStartTime // Generated before this function is fired
            },
            ResultDateTime: {
                value: payload.resultDateTime
            },
            ResultServer: {
                value: payload.world_id
            },
            ResultAlertCont: {
                value: payload.zone
            },
            ResultAlertType: {
                value: payload.metagame_event_id
            },
            Valid: {
                value: 1
            },
            InProgress: {
                value: 1
            }
        }

        return object;
    }

    module.exports = obj;
}());
