const jwt = require("jsonwebtoken");
const env = require("../config/env");

function signAdminToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "12h" });
}

function verifyAdminToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = {
  signAdminToken,
  verifyAdminToken
};
