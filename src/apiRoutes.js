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

        return res.status(200);
    } catch (err) {
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
        await db.query(
            `
                UPDATE licenses
                SET "on" = False
                WHERE license = $1;
            `,
            [license]
        );

        return res.status(200);
    } catch (err) {
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
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

export default router;