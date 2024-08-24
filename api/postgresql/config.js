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
    try {
        const client = await pool.connect();
        console.log('Connected to the database!');
        client.release();
    } catch (error) {
        console.error('Error connecting to the database:', error);
    }
}

testDatabaseConnection()

module.exports = pool;