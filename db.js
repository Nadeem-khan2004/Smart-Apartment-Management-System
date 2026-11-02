const mysql = require("mysql2");

// Set your local MySQL password here. Do not upload real credentials to GitHub.
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "@Khan2004",
    database: "apartment_db"
});

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err.message);
        return;
    }
    console.log("MySQL connected successfully!");
});

module.exports = db;
