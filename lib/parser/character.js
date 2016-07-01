(function () {
    'use strict';

    module.exports = {
        'parse': function(censusObj) {
            return {
                id: censusObj.character_id,
                name: censusObj.name.first,
                faction: parseInt(censusObj.faction_id),
                br: parseInt(censusObj.battle_rank.value),
                outfit: (censusObj.outfit !== undefined) ? censusObj.outfit.outfit_id : null
            }
        }
    }
}());
