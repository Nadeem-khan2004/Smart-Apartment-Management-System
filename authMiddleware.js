
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("./config");

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Please log in first."
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.log("Token error:", error.message);

        return res.status(401).json({
            message: "Invalid or expired token."
        });
    }
}

function ownerOnly(req, res, next) {
    if (!req.user || req.user.role !== "owner") {
        return res.status(403).json({
            message: "Access denied. Owner only."
        });
    }

    next();
}

module.exports = { verifyToken, ownerOnly };
