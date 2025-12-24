const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  const token = req.header('x-auth-token');

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey123");
    
    // Most JWT payloads in this project are { user: { id: "..." } }
    // We check both possibilities to be safe
    if (decoded.user) {
      req.user = decoded.user;
    } else {
      req.user = decoded; // fallback if user is at the root
    }

    // FINAL SAFETY CHECK: If req.user is still null/undefined or has no id
    if (!req.user || (!req.user.id && !req.user._id)) {
        throw new Error("Invalid token structure");
    }

    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};