import jwt from "jsonwebtoken";
import 'dotenv/config';

export function sign_token(id) {
    const token = jwt.sign(
        { id: id },
        process.env.SECRET_KEY,
        { expiresIn: '72h' }
    );

    return token;
}

export function verify_token(token) {
    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        return {status: "ok", id: decoded};
    } catch (err) {
        return {status: "error", err: err.message};
    }
}
