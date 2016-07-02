(function () {
    'use strict';

    module.exports = {
        // Passed in from Insert Alert
        'parseFromInsertAlert': function(payload) {
            let object = {
                id: payload.id,
                world: parseInt(payload.world_id),
                zone: parseInt(payload.zone),
                started: parseInt(payload.resultStartTime),
                vs: parseInt(Math.round(payload.faction_vs)),
                nc: parseInt(Math.round(payload.faction_nc)),
                tr: parseInt(Math.round(payload.faction_tr))
            }

            return object;
        }
    }
}());
