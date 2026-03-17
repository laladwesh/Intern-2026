import express from "express";
import Student from "../models/Student.model.js";
import { protect, studentOnly } from "../middleware/auth.js";

const router = express.Router();

// @route   POST /api/student/auth/register
// @desc    Deprecated. Students must use Outlook login.
router.post("/register", async (req, res) => {
  return res.status(410).json({
    message: "Password registration is disabled. Please login with institute Outlook.",
  });
});

// @route   POST /api/student/auth/login
// @desc    Deprecated. Students must use Outlook login.
router.post("/login", async (req, res) => {
  return res.status(410).json({
    message: "Password login is disabled. Please login with institute Outlook.",
  });
});

// @route   GET /api/student/auth/me
// @desc    Get current student profile
router.get("/me", protect, studentOnly, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select("-__v");
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   POST /api/student/auth/logout
// @desc    Logout student
router.post("/logout", protect, studentOnly, (req, res) => {
  res.json({ message: "Logged out successfully" });
});

export default router;
