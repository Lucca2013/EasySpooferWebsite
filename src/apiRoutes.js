import { Router } from "express";
import { sign_token, verify_token } from "./jwt.js";
import db from "./db.js";

const router = Router();

router.post("/login", async (req, res) => {
    if (!req.body?.user || !req.body?.password) {
        return res.status(400).json({ error: "USER_OR_PASSWORD_MISSING" });
    }

    const { user, password } = req.body;

    try {
        const user_db = await db.query(
            "SELECT password, id FROM users WHERE name = $1;",
            [user]
        );

        if (user_db.rows.length === 0) {
            return res.status(404).json({ error: "USER_NOT_FOUND" });
        }

        if (password !== user_db.rows[0].password) {
            return res.status(400).json({ error: "PASSWORD_WRONG" });
        }

        return res.status(200).json({ token: sign_token(user_db.rows[0].id) });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
    }
});

router.post("/verify_token", async (req, res) => {
    const token = get_token(req, res);

    const result = verify_token(token);

    if (result.status === "ok") {
        res.status(200).json({ token: sign_token(result.id) });
    } else {
        res.status(400).json({ error: result.err });
    }
});

router.get("/license", async (req, res) => {
    const token = get_token(req, res);

    const result = verify_token(token);

    if (result.status !== "ok") {
        res.status(400).json({ error: result.err });
    }

    try {
        const licenses = await db.query(
            "SELECT * FROM licenses"
        );

        return res.status(200).json({ licenses: licenses.rows });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
    }
});

router.post("/license", async (req, res) => {
    const token = get_token(req, res);

    const result = verify_token(token);

    if (result.status !== "ok") {
        res.status(400).json({ error: result.err });
    }

    if (!req.body?.client || !req.body?.plan || !req.body?.license) {
        return res.status(400).json({ error: "CLIENT_OR_PLAN_OR_LICENSE_MISSING" });
    }

    const { client, plan, license } = req.body;
    let time_expire = "";

    if (plan == "Mensal") {
        const dateNow = new Date();

        const futureDate = new Date();
        futureDate.setDate(dateNow.getDate() + 30);

        time_expire = futureDate.toString();
    } else {
        time_expire = null;
    }

    try {
        const licenses = await db.query(
            `
                INSERT INTO licenses (client, plan, license, time_expire, uses, "on")
                VALUES ($1, $2, $3, $4, 0, True)
            `,
            [client, plan, license, time_expire]
        );

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
    }
});

router.delete("/license", async (req, res) => {
    const token = get_token(req, res);

    const result = verify_token(token);

    if (result.status !== "ok") {
        res.status(400).json({ error: result.err });
    }

    if (!req.body?.license) {
        return res.status(400).json({ error: "LICENSE_MISSING" });
    }

    const { license } = req.body;

    try {
        const licenses = await db.query(
            `
                UPDATE licenses
                SET "on" = False
                WHERE license = $1;
            `,
            [license]
        );

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
    }
});

router.post("/verify_license", async (req, res) => {
    if (!req.body?.license) {
        return res.status(400).json({ error: "LICENSE_MISSING" });
    }

    const { license } = req.body;

    try {
        const licenses = await db.query(
            `
                SELECT *
                FROM licenses
                WHERE license = $1
                LIMIT 1
            `,
            [license]
        );

        if (licenses.rows.length === 0) {
            return res.status(400).json({ valid: false, error: "License not found" });
        } else if (licenses.rows[0].on === false) {
            return res.status(400).json({ valid: false, error: "License not on" });
        } else if (verify_time_expiration(licenses.rows[0].time_expire)) {
            return res.status(400).json({ valid: false, error: "License time expired, buy a new one" });
        }

        return res.status(200).json({ valid: true, token: sign_token(license, "5m") });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
    }
});

router.post("/verify_license", async (req, res) => {
    if (!req.body?.license) {
        return res.status(400).json({ error: "LICENSE_MISSING" });
    }

    const { license } = req.body;

    try {
        const licenses = await db.query(
            `
                SELECT *
                FROM licenses
                WHERE license = $1
                LIMIT 1
            `,
            [license]
        );

        if (licenses.rows.length === 0) {
            return res.status(400).json({ valid: false, error: "License not found" });
        } else if (licenses.rows[0].on === false) {
            return res.status(400).json({ valid: false, error: "License not on" });
        } else if (verify_time_expiration(licenses.rows[0].time_expire)) {
            return res.status(400).json({ valid: false, error: "License time expired, buy a new one" });
        }

        return res.status(200).json({ valid: true, token: sign_token(license, "5m") });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
    }
});

router.post("/verify_license_token", async (req, res) => {
    const token = get_token(req, res);

    const result = verify_token(token);

    if (result.status === "ok") {
        const licenses = await db.query(
            `
                SELECT *
                FROM licenses
                WHERE license = $1
                LIMIT 1
            `,
            [result.id]
        );

        if (licenses.rows.length === 0) {
            return res.status(400).json({ valid: false, error: "License not found" });
        }

        res.status(200).json({ valid: true });
    } else {
        res.status(400).json({ valid: false, error: result.err });
    }
});

function get_token(req, res) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'TOKEN_MISSING' });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'WRONG_TOKEN' });
    }

    return parts[1];
}

function verify_time_expiration(time_expire) {
    const time = new Date(time_expire);

    const now = new Date();

    if (now > time) {
        return true
    } else {
        return false
    }
}

export default router;