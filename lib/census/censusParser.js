(function () {
    'use strict';

    let obj = {};

    obj.parseCharacter = function (censusObj) {
        return {
            id: censusObj.character_id,
            name: censusObj.name.first,
            faction: parseInt(censusObj.faction_id),
            br: parseInt(censusObj.battle_rank.value),
            outfit: (censusObj.outfit !== undefined) ? censusObj.outfit.outfit_id : null
        }
    };

    obj.parseOutfit = function (censusObj) {
        return {
            id: censusObj.outfit_id,
            name: censusObj.name,
            tag: (censusObj.alias) ? censusObj.alias : null
        }
    }

    module.exports = obj;
}());
