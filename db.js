
require("dotenv").config();
const mysql = require("mysql2");

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 4000),
    ssl: {
        minVersion: "TLSv1.2"
    },
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
});

module.exports = db;
