const express = require("express");
const bcrypt = require("bcryptjs");
const env = require("../config/env");
const { query } = require("../db/neon");
const { signAdminToken, verifyAdminToken } = require("../lib/auth");

const router = express.Router();

router.get("/session", (req, res) => {
  const token = req.cookies?.[env.cookieName];

  if (!token) {
    res.status(401).json({ message: "No active session." });
    return;
  }

  try {
    const decoded = verifyAdminToken(token);
    res.json({ admin: { username: decoded.username } });
  } catch {
    res.clearCookie(env.cookieName);
    res.status(401).json({ message: "No active session." });
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "").trim();

    if (!username || !password) {
      res.status(400).json({ message: "Username and password are required." });
      return;
    }

    const result = await query(
      "SELECT username, password_hash FROM admins WHERE username = $1",
      [username]
    );

    const admin = result.rows[0];

    if (!admin) {
      res.status(401).json({ message: "Invalid credentials." });
      return;
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);

    if (!isValid) {
      res.status(401).json({ message: "Invalid credentials." });
      return;
    }

    const token = signAdminToken({ username: admin.username });

    res.cookie(env.cookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 12 * 60 * 60 * 1000
    });

    res.json({ admin: { username: admin.username } });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie(env.cookieName);
  res.json({ ok: true });
});

module.exports = router;
