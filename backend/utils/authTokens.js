import jwt from "jsonwebtoken";
import crypto from "node:crypto";

export function signSessionToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "12h" }
  );
}

export function verifySessionToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET); // throws if invalid/expired
}

export function generateOtp() {
  return String(crypto.randomInt(100000, 999999)); // 6-digit code
}

export function generateOpaqueToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
