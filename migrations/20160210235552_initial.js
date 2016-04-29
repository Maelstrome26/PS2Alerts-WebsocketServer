
exports.up = function(knex, Promise) {

    return Promise.all([

        knex.schema.createTable('ws_events', function(table) {
            table.increments('resultID').primary();
            table.integer('world');
            table.string('outfit', 45);
            table.string('starts', 45);
            table.string('ends', 45);
            table.timestamps();
        })
    ])
};

exports.down = function(knex, Promise) {  
    return Promise.all([
        knex.schema.dropTable('ws_events'),
    ])
};
