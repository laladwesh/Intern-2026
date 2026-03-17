import jwt from "jsonwebtoken";

// Generate JWT token
export const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// Protect routes - verify JWT
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header only (Bearer token)
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token invalid" });
  }
};

// Admin only middleware
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({ message: "Access denied. Admin only." });
  }
};

// Student only middleware
export const studentOnly = (req, res, next) => {
  if (req.user && req.user.role === "student") {
    next();
  } else {
    return res.status(403).json({ message: "Access denied. Student only." });
  }
};

// Check if deadline has passed (student can only edit before deadline)
export const checkDeadline = async (req, res, next) => {
  try {
    const { default: Deadline } = await import("../models/Deadline.model.js");
    const activeDeadline = await Deadline.findOne({ is_active: true }).sort({
      deadline_date: -1,
    });

    if (!activeDeadline) {
      return next(); // No deadline set, allow edit
    }

    if (new Date() > new Date(activeDeadline.deadline_date)) {
      return res.status(403).json({
        message: "Deadline has passed. You can no longer edit your details.",
        deadline: activeDeadline.deadline_date,
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: "Server error checking deadline" });
  }
};
