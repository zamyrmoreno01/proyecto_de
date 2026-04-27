const env = require("../config/env");
const { verifyAdminToken } = require("../lib/auth");

function requireAdmin(req, res, next) {
  const token = req.cookies?.[env.cookieName];

  if (!token) {
    res.status(401).json({ message: "Admin authentication required." });
    return;
  }

  try {
    req.admin = verifyAdminToken(token);
    next();
  } catch {
    res.clearCookie(env.cookieName);
    res.status(401).json({ message: "Admin authentication required." });
  }
}

module.exports = {
  requireAdmin
};
