
const bcrypt = require("bcrypt");
const db = require("./db");

async function createOwner() {
    const name = "Apartment Owner";
    const email = "owner@apartment.com";
    const password = "OwnerPass123";

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO users (name, email, password, role)
            VALUES (?, ?, ?, 'owner')
        `;

        db.query(
            sql,
            [name, email, hashedPassword],
            (err, result) => {
                if (err) {
                    if (err.code === "ER_DUP_ENTRY") {
                        console.log("Owner account already exists.");
                    } else {
                        console.log("Error creating owner:", err.message);
                    }
                } else {
                    console.log("Owner account created successfully!");
                    console.log("Email:", email);
                    console.log("Password:", password);
                }

                db.end();
            }
        );
    } catch (err) {
        console.log("Error:", err.message);
        db.end();
    }
}

createOwner();
