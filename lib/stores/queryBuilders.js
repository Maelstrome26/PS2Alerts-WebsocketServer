(function () {
    'use strict';

    const _ = require('lodash');
    const db = require('./dbClient.js').getDbClient();
    let obj = {};

    /*
    REQUIRES AN SUPPLIED OBJECT IN THE FOLLOWING FORMAT:

    queryObject = {
        FIELD: {
            op: '=', // Optional
            value: VALUE
        },
        FIELD2: {
            value: VALUE
        }
    }
    */

    obj.buildWhereQuery = function(queryObject, table) {
        let query = db(table);

        // Goes through the queryObject and chains on the wheres
        _.each(queryObject, function(props, col) {
            if (! props.op) {
                props.op = '=';
            }
            query.where(col, props.op, props.value);
        });

        return query;
    };

    obj.buildInsertObject = function(queryObject, table) {
        let insertObject = {};

        // Build a new object using only the columns and values
        _.each(queryObject, function(props, col) {
            insertObject[col] = props.value;
        });

        return insertObject;
    };

    module.exports = obj;
}());
