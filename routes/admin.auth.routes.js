import express from "express";
import Admin from "../models/Admin.model.js";
import { generateToken, protect, adminOnly } from "../middleware/auth.js";
import { getAuthUrl, acquireTokenByCode } from "../config/msal.js";

const router = express.Router();

// @route   GET /api/admin/auth/login
// @desc    Redirect to Microsoft Outlook login
router.get("/login", async (req, res) => {
  try {
    const authUrl = await getAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).json({ message: "Error initiating Outlook login", error: error.message });
  }
});

// @route   GET /api/admin/auth/callback
// @desc    Handle Outlook OAuth callback
router.get("/callback", async (req, res) => {
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

    // Find or create admin
    let admin = await Admin.findOne({ email });

    if (!admin) {
      // Only allow pre-registered admins (add admins via seed script)
      return res.status(403).json({
        message: "You are not authorized as an admin. Contact administrator.",
      });
    }

    // Update outlook_id if not set
    if (!admin.outlook_id) {
      admin.outlook_id = outlookId;
      admin.name = name;
      await admin.save();
    }

    const token = generateToken(admin._id, admin.role);

    // Set cookie and redirect to frontend
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.redirect(`${process.env.FRONTEND_URL}/admin/dashboard?token=${token}`);
  } catch (error) {
    res.status(500).json({ message: "Outlook auth failed", error: error.message });
  }
});

// @route   GET /api/admin/auth/me
// @desc    Get current admin profile
router.get("/me", protect, adminOnly, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select("-__v");
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   POST /api/admin/auth/logout
// @desc    Logout admin
router.post("/logout", protect, adminOnly, (req, res) => {
  res.cookie("token", "", { httpOnly: true, expires: new Date(0) });
  res.json({ message: "Logged out successfully" });
});

export default router;
