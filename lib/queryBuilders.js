(function () {
    'use strict';

    const config = require('../config.js');
    const _ = require('lodash');
    const db = require('./stores/dbClient.js').getDbClient();
    let obj = {};

    obj.buildWhereQuery = function(queryObject, table) {
        let query = db(table);

        // Goes through the queryObject and chains on the wheres
        _.each(queryObject, function(props, col) {
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
