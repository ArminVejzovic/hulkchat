const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function testDatabaseConnection() {
    const client = await pool.connect();
    client.release();
    console.log("spojio se")
}

testDatabaseConnection()

module.exports = pool;