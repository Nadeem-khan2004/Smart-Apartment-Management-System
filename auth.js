
const { JWT_SECRET } = require("./config");
const express = require("express");
const bcrypt = require("bcrypt");
const db = require("./db");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Register a new tenant
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO users (name, email, password, role)
            VALUES (?, ?, ?, 'tenant')
        `;

        db.query(
            sql,
            [name, email.trim().toLowerCase(), hashedPassword],
            (err, result) => {
                if (err) {
                    if (err.code === "ER_DUP_ENTRY") {
                        return res.status(409).json({
                            message: "Email already registered"
                        });
                    }

                    console.error(err);
                    return res.status(500).json({
                        message: "Database error"
                    });
                }

                return res.status(201).json({
                    message: "Registration successful"
                });
            }
        );
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: "Server error during registration"
        });
    }
});

// Login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const sql = "SELECT * FROM users WHERE email = ?";

        db.query(sql, [email.trim().toLowerCase()], async (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    message: "Database error"
                });
            }

            if (results.length === 0) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }

            const user = results[0];

            const isPasswordCorrect = await bcrypt.compare(
                password,
                user.password
            );

            if (!isPasswordCorrect) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }

            const token = jwt.sign(
                {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                JWT_SECRET,
                { expiresIn: "1h" }
            );

            return res.status(200).json({
                message: "Login successful",
                token: token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: "Server error during login"
        });
    }
});

module.exports = router;
