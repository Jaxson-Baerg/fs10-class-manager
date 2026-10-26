const { Pool } = require('pg');
require('dotenv').config();

const connectionString = `postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=disable` ;

const db = new Pool({
    connectionString: connectionString || process.env.DATABASE_URL,
});

// Alberta no longer observes daylight savings: pin the Postgres session
// timezone to fixed Mountain time (UTC-7) so naive datetime strings written
// by the forms are stored as Mountain wall time instead of the host's default
db.on('connect', (client) => client.query("SET timezone TO 'MST7'"));

console.log( `Connected to ${process.env.DB_NAME} on ${process.env.DB_HOST}` );
db.connect();

module.exports = db;