const jwt = require("jsonwebtoken");
require("dotenv").config();

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).send("Access denied, no token provided");
  }

  try {
    jwt.verify(token, SUPABASE_JWT_SECRET);
    next(); // Token is valid, proceed to the next middleware
  } catch (error) {
    return res.status(403).send("Invalid token");
  }
};

module.exports = authenticateToken;
