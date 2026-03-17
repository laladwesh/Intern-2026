import express from "express";
import Admin from "../models/Admin.model.js";
import Student from "../models/Student.model.js";
import { generateToken, protect } from "../middleware/auth.js";
import { getAuthUrl, acquireTokenByCode } from "../config/msal.js";

const router = express.Router();

// @route   GET /api/auth/outlook/login
// @desc    Unified Outlook login for admin and student
router.get("/outlook/login", async (req, res) => {
  try {
    const authUrl = await getAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).json({ message: "Error initiating Outlook login", error: error.message });
  }
});

// @route   GET /api/auth/outlook/callback
// @desc    Unified Outlook OAuth callback for admin + student
router.get("/outlook/callback", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ message: "Authorization code not provided" });
    }

    const response = await acquireTokenByCode(code);
    const { account } = response;

    if (!account) {
      return res.status(400).json({ message: "Could not get user info from Microsoft" });
    }

    const email = account.username;
    const name = account.name || email;
    const outlookId = account.homeAccountId;

    const frontendBasePath = process.env.APP_BASE_PATH || "/intern-2026";

    // 1) Check admin first
    const admin = await Admin.findOne({ email });
    if (admin) {
      if (!admin.outlook_id) {
        admin.outlook_id = outlookId;
        admin.name = name;
        await admin.save();
      }

      const token = generateToken(admin._id, "admin");

      return res.redirect(
        `${process.env.FRONTEND_URL}${frontendBasePath}/?token=${token}&role=admin`
      );
    }

    // 2) Check student
    const student = await Student.findOne({ email });
    if (student) {
      if (!student.outlook_id) {
        student.outlook_id = outlookId;
      }
      if (!student.is_registered) {
        student.is_registered = true;
      }
      await student.save();

      const token = generateToken(student._id, "student");

      return res.redirect(
        `${process.env.FRONTEND_URL}${frontendBasePath}/?token=${token}&role=student`
      );
    }

    return res.status(403).json({
      message: "You are not authorized. Your Outlook email is not mapped to admin or student records.",
    });
  } catch (error) {
    res.status(500).json({ message: "Outlook auth failed", error: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get currently logged-in user profile (admin/student)
router.get("/me", protect, async (req, res) => {
  try {
    if (req.user.role === "admin") {
      const admin = await Admin.findById(req.user.id).select("-__v");
      if (!admin) return res.status(404).json({ message: "Admin not found" });
      return res.json({ role: "admin", user: admin });
    }

    if (req.user.role === "student") {
      const student = await Student.findById(req.user.id).select("-__v");
      if (!student) return res.status(404).json({ message: "Student not found" });
      return res.json({ role: "student", user: student });
    }

    return res.status(403).json({ message: "Invalid role" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout current user
router.post("/logout", protect, (req, res) => {
  res.json({ message: "Logged out successfully" });
});

export default router;
