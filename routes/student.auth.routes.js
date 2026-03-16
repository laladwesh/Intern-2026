import express from "express";
import Student from "../models/Student.model.js";
import { generateToken, protect, studentOnly } from "../middleware/auth.js";

const router = express.Router();

// @route   POST /api/student/auth/register
// @desc    Student registration (after admin bulk uploads them, they set password)
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Find student by email (must have been bulk uploaded by admin)
    const student = await Student.findOne({ email });

    if (!student) {
      return res.status(404).json({
        message: "Student not found. Please contact admin to add you first.",
      });
    }

    if (student.is_registered) {
      return res.status(400).json({ message: "Student already registered. Please login." });
    }

    // Set password and mark as registered
    student.password = password;
    student.is_registered = true;
    await student.save();

    const token = generateToken(student._id, "student");

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: "Registration successful",
      token,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        roll_number: student.roll_number,
        registration_complete: student.registration_complete,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   POST /api/student/auth/login
// @desc    Student login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const student = await Student.findOne({ email });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (!student.is_registered) {
      return res.status(400).json({ message: "Please register first" });
    }

    const isMatch = await student.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(student._id, "student");

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "Login successful",
      token,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        roll_number: student.roll_number,
        registration_complete: student.registration_complete,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/student/auth/me
// @desc    Get current student profile
router.get("/me", protect, studentOnly, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select("-password -__v");
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
  res.cookie("token", "", { httpOnly: true, expires: new Date(0) });
  res.json({ message: "Logged out successfully" });
});

export default router;
