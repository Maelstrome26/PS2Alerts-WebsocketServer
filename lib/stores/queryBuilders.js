(function () {
    'use strict';

    const _ = require('lodash');
    const db = require('./dbClient.js').getDbClient();
    let obj = {};

    /*
    REQUIRES AN SUPPLIED OBJECT IN THE FOLLOWING FORMAT:

    queryObject = {
        FIELD: {
            op: '=',
            value: VALUE
        },
        FIELD2: {
            op: '=',
            value: VALUE
        }
    }

    */

    obj.buildWhereQuery = function(queryObject, table) {
        let query = db(table);

        // Goes through the queryObject and chains on the wheres
        _.each(queryObject, function(props, col) {
            query.where(col, props.op, props.value);
        });

        return query;
    };


    module.exports = obj;
}());
