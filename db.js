
require("dotenv").config();
const mysql = require("mysql2");

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
 port: Number(process.env.DB_PORT || 4000),
    ssl: {
        minVersion: "TLSv1.2"
    }
});

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err.message);
        return;
    }
    console.log("TiDB Cloud connected successfully!");
});

module.exports = db;
