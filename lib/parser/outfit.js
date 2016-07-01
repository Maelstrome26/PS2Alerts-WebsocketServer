(function () {
    'use strict';

    module.exports = {
        'parse': function(censusObj) {
            return {
                id: censusObj.outfit_id,
                name: censusObj.name,
                tag: (censusObj.alias) ? censusObj.alias : null
            }
        }
    }
}());
