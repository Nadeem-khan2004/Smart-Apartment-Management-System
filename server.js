const express = require("express");
const db = require("./db");
const authRoutes = require("./auth");
const { verifyToken, ownerOnly } = require("./authMiddleware");

const app = express();

app.use(express.json());
app.use(express.static("public"));
app.get("/", (req, res) => {
    res.redirect("/index.html");
});
app.use("/api/auth", authRoutes);

function dbQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (error, results) => {
            if (error) reject(error);
            else resolve(results);
        });
    });
}

function serverError(res, label, error) {
    console.error(label, error);
    return res.status(500).json({ message: "Something went wrong on the server." });
}

app.get("/api/flats", verifyToken, ownerOnly, async (req, res) => {
    try {
        const flats = await dbQuery(`
            SELECT f.id, f.flat_number, f.building_name, f.monthly_rent,
                   COALESCE(f.status, IF(f.tenant_id IS NULL, 'Available', 'Occupied')) AS status,
                   f.tenant_id, u.name AS tenant_name, u.email AS tenant_email
            FROM flats f LEFT JOIN users u ON u.id = f.tenant_id
            ORDER BY f.flat_number
        `);
        res.json(flats);
    } catch (error) { serverError(res, "Fetch flats error:", error); }
});

app.post("/api/flats", verifyToken, ownerOnly, async (req, res) => {
    const { flat_number, building_name, monthly_rent } = req.body;
    const rent = Number(monthly_rent);
    if (!String(flat_number || "").trim() || !Number.isFinite(rent) || rent <= 0)
        return res.status(400).json({ message: "Flat number and positive monthly rent are required." });
    try {
        const result = await dbQuery(
            "INSERT INTO flats (flat_number, building_name, monthly_rent, status) VALUES (?, ?, ?, 'Available')",
            [String(flat_number).trim(), String(building_name || "").trim() || null, rent]
        );
        res.status(201).json({ message: "Flat added successfully.", flatId: result.insertId });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "That flat number already exists." });
        serverError(res, "Add flat error:", error);
    }
});

app.put("/api/flats/:id", verifyToken, ownerOnly, async (req, res) => {
    const { flat_number, building_name, monthly_rent } = req.body;
    const rent = Number(monthly_rent);
    if (!String(flat_number || "").trim() || !Number.isFinite(rent) || rent <= 0)
        return res.status(400).json({ message: "Flat number and positive monthly rent are required." });
    try {
        const result = await dbQuery(
            "UPDATE flats SET flat_number=?, building_name=?, monthly_rent=? WHERE id=?",
            [String(flat_number).trim(), String(building_name || "").trim() || null, rent, req.params.id]
        );
        if (!result.affectedRows) return res.status(404).json({ message: "Flat not found." });
        res.json({ message: "Flat updated successfully." });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "That flat number already exists." });
        serverError(res, "Update flat error:", error);
    }
});

app.get("/api/tenants", verifyToken, ownerOnly, async (req, res) => {
    try {
        const tenants = await dbQuery(`
            SELECT u.id, u.name, u.email, f.id AS flat_id, f.flat_number, f.building_name
            FROM users u LEFT JOIN flats f ON f.tenant_id=u.id
            WHERE u.role='tenant' ORDER BY u.name
        `);
        res.json(tenants);
    } catch (error) { serverError(res, "Fetch tenants error:", error); }
});

app.post("/api/assignments", verifyToken, ownerOnly, async (req, res) => {
    const tenantId = Number(req.body.tenant_id);
    const flatId = Number(req.body.flat_id);
    if (!Number.isInteger(tenantId) || !Number.isInteger(flatId) || tenantId < 1 || flatId < 1)
        return res.status(400).json({ message: "Select a valid tenant and flat." });
    try {
        const tenant = await dbQuery("SELECT id FROM users WHERE id=? AND role='tenant'", [tenantId]);
        if (!tenant.length) return res.status(404).json({ message: "Tenant not found." });
        const flat = await dbQuery("SELECT id, tenant_id FROM flats WHERE id=?", [flatId]);
        if (!flat.length) return res.status(404).json({ message: "Flat not found." });
        if (flat[0].tenant_id) return res.status(409).json({ message: "This flat is already occupied." });
        const existing = await dbQuery("SELECT id FROM flats WHERE tenant_id=?", [tenantId]);
        if (existing.length) return res.status(409).json({ message: "This tenant already has an assigned flat. Vacate it before assigning another." });
        await dbQuery("UPDATE flats SET tenant_id=?, status='Occupied' WHERE id=?", [tenantId, flatId]);
        res.status(200).json({ message: "Flat assigned successfully." });
    } catch (error) { serverError(res, "Assign flat error:", error); }
});

app.delete("/api/assignments/:flatId", verifyToken, ownerOnly, async (req, res) => {
    try {
        const result = await dbQuery("UPDATE flats SET tenant_id=NULL, status='Available' WHERE id=?", [req.params.flatId]);
        if (!result.affectedRows) return res.status(404).json({ message: "Flat not found." });
        res.json({ message: "Flat is now available." });
    } catch (error) { serverError(res, "Vacate flat error:", error); }
});

// Tenant can see only their own assigned flat.
app.get("/api/tenant/dashboard", verifyToken, async (req, res) => {
    if (req.user.role !== "tenant") return res.status(403).json({ message: "Tenant access only." });
    try {
        const rows = await dbQuery(`
            SELECT id, flat_number, building_name, monthly_rent, status
            FROM flats WHERE tenant_id=? LIMIT 1
        `, [req.user.id]);
        const rent = await dbQuery(`
            SELECT id, amount, payment_date, period_month, period_year, notes
            FROM rent_payments WHERE tenant_id=? ORDER BY period_year DESC, period_month DESC, payment_date DESC
        `, [req.user.id]);
        const notices = await dbQuery("SELECT id, title, message, created_at FROM notices ORDER BY created_at DESC LIMIT 50");
      const utilities = await dbQuery(
    "SELECT id, utility_type, message, created_at FROM utility_updates ORDER BY created_at DESC LIMIT 50"
);
        const requests = await dbQuery(
    "SELECT id, title, description, status, created_at, updated_at FROM maintenance_requests WHERE tenant_id=? ORDER BY created_at DESC",
    [req.user.id]
);
        res.json({ flat: rows[0] || null, rentPayments: rent, notices, utilities, requests });
    } catch (error) { serverError(res, "Tenant dashboard error:", error); }
});

app.get("/api/rent", verifyToken, ownerOnly, async (req, res) => {
    try {
        const rows = await dbQuery(`
            SELECT rp.*, u.name AS tenant_name, u.email, f.flat_number
            FROM rent_payments rp JOIN users u ON u.id=rp.tenant_id
            LEFT JOIN flats f ON f.tenant_id=u.id
            ORDER BY rp.period_year DESC, rp.period_month DESC, rp.payment_date DESC
        `);
        res.json(rows);
    } catch (error) { serverError(res, "Fetch rent error:", error); }
});

app.post("/api/rent", verifyToken, ownerOnly, async (req, res) => {
    const tenantId = Number(req.body.tenant_id);
    const amount = Number(req.body.amount);
    const periodMonth = Number(req.body.period_month);
    const periodYear = Number(req.body.period_year);
    const notes = String(req.body.notes || "").trim();
    if (!Number.isInteger(tenantId) || tenantId < 1 || !Number.isFinite(amount) || amount <= 0 ||
        !Number.isInteger(periodMonth) || periodMonth < 1 || periodMonth > 12 ||
        !Number.isInteger(periodYear) || periodYear < 2000 || periodYear > 2200)
        return res.status(400).json({ message: "Enter a valid tenant, amount, month, and year." });
    try {
        const tenant = await dbQuery("SELECT id FROM users WHERE id=? AND role='tenant'", [tenantId]);
        if (!tenant.length) return res.status(404).json({ message: "Tenant not found." });
        const result = await dbQuery(
            "INSERT INTO rent_payments (tenant_id, amount, payment_date, period_month, period_year, notes) VALUES (?, ?, CURRENT_DATE, ?, ?, ?)",
            [tenantId, amount, periodMonth, periodYear, notes || null]
        );
        res.status(201).json({ message: "Rent payment recorded.", id: result.insertId });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "A payment record already exists for this tenant and month." });
        serverError(res, "Record rent error:", error);
    }
});

app.get("/api/notices", verifyToken, async (req, res) => {
    try { res.json(await dbQuery("SELECT id, title, message, created_at FROM notices ORDER BY created_at DESC")); }
    catch (error) { serverError(res, "Fetch notices error:", error); }
});

app.post("/api/notices", verifyToken, ownerOnly, async (req, res) => {
    const title = String(req.body.title || "").trim();
    const message = String(req.body.message || "").trim();
    if (!title || !message) return res.status(400).json({ message: "Title and message are required." });
    try {
        const result = await dbQuery("INSERT INTO notices (title, message, created_by) VALUES (?, ?, ?)", [title, message, req.user.id]);
        res.status(201).json({ message: "Notice published.", id: result.insertId });
    } catch (error) { serverError(res, "Publish notice error:", error); }
});

app.delete("/api/notices/:id", verifyToken, ownerOnly, async (req, res) => {
    try {
        const result = await dbQuery("DELETE FROM notices WHERE id=?", [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ message: "Notice not found." });
        res.json({ message: "Notice deleted." });
    } catch (error) { serverError(res, "Delete notice error:", error); }
});


app.get("/api/utilities", verifyToken, async (req, res) => {
    try {
        res.json(
            await dbQuery(
                "SELECT id, utility_type, message, created_at FROM utility_updates ORDER BY created_at DESC"
            )
        );
    } catch (error) {
        serverError(res, "Fetch utility updates error:", error);
    }
});


app.post("/api/utilities", verifyToken, ownerOnly, async (req, res) => {
    const type = String(req.body.utility_type || "").trim().toLowerCase();
    const message = String(req.body.message || "").trim();
    if (!["water", "electricity", "general"].includes(type) || !message)
        return res.status(400).json({ message: "Choose water, electricity, or general and enter a message." });
    try {
        const result = await dbQuery("INSERT INTO utility_updates (utility_type, message, created_by) VALUES (?, ?, ?)", [type, message, req.user.id]);
        res.status(201).json({ message: "Utility update published.", id: result.insertId });
    } catch (error) { serverError(res, "Publish utility update error:", error); }
});


app.post("/api/maintenance", verifyToken, async (req, res) => {
    if (req.user.role !== "tenant") {
        return res.status(403).json({ message: "Tenant access only." });
    }

    const title = String(req.body.title || req.body.subject || "").trim();
    const description = String(req.body.description || "").trim();

    if (!title || !description) {
        return res.status(400).json({
            message: "Title and description are required."
        });
    }

    try {
        const result = await dbQuery(
            "INSERT INTO maintenance_requests (tenant_id, title, description) VALUES (?, ?, ?)",
            [req.user.id, title, description]
        );

        res.status(201).json({
            message: "Request submitted.",
            id: result.insertId
        });
    } catch (error) {
        serverError(res, "Submit maintenance request error:", error);
    }
});



app.get("/api/maintenance", verifyToken, async (req, res) => {
    try {
        if (req.user.role === "owner") {
            const rows = await dbQuery(`
                SELECT m.*, u.name AS tenant_name, u.email, f.flat_number
                FROM maintenance_requests m
                JOIN users u ON u.id = m.tenant_id
                LEFT JOIN flats f ON f.tenant_id = u.id
                ORDER BY m.created_at DESC
            `);

            return res.json(rows);
        }

        if (req.user.role === "tenant") {
            const rows = await dbQuery(`
                SELECT id, tenant_id, title, description, status,
                       created_at, updated_at
                FROM maintenance_requests
                WHERE tenant_id = ?
                ORDER BY created_at DESC
            `, [req.user.id]);

            return res.json(rows);
        }

        return res.status(403).json({ message: "Access denied." });
    } catch (error) {
        serverError(res, "Fetch maintenance requests error:", error);
    }
});


app.patch("/api/maintenance/:id", verifyToken, ownerOnly, async (req, res) => {
    const status = String(req.body.status || "");
    if (!["Open", "In Progress", "Resolved", "Rejected"].includes(status))
        return res.status(400).json({ message: "Invalid request status." });
    try {
        const result = await dbQuery("UPDATE maintenance_requests SET status=? WHERE id=?", [status, req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ message: "Request not found." });
        res.json({ message: "Request status updated." });
    } catch (error) { serverError(res, "Update maintenance status error:", error); }
});
module.exports = app;

