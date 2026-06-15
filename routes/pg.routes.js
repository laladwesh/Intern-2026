import express from "express";
import path from "path";
import fs from "fs";
import PgStudent from "../models/PgStudent.model.js";
import PgDeadline from "../models/PgDeadline.model.js";
import { protect } from "../middleware/auth.js";
import { uploadPgPhoto } from "../middleware/pgUpload.js";

const router = express.Router();

const pgStudentOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "pg_student") {
    return res.status(403).json({ message: "Access denied. PG Student only." });
  }
  next();
};

const checkPgDeadline = async (req, res, next) => {
  try {
    const deadline = await PgDeadline.findOne({ is_active: true }).sort({ deadline_date: -1 });
    if (deadline && new Date() > new Date(deadline.deadline_date)) {
      return res.status(403).json({
        message: "Deadline has passed. You can no longer submit.",
        deadline: deadline.deadline_date,
      });
    }
    next();
  } catch {
    res.status(500).json({ message: "Server error checking deadline" });
  }
};

// GET /api/pg/deadline — public, no auth needed
router.get("/deadline", async (req, res) => {
  try {
    const deadline = await PgDeadline.findOne({ is_active: true }).sort({ deadline_date: -1 });
    res.json({ deadline: deadline || null });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/pg/profile
router.get("/profile", protect, pgStudentOnly, async (req, res) => {
  try {
    const student = await PgStudent.findById(req.user.id).select("-__v");
    if (!student) return res.status(404).json({ message: "PG Student not found" });
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// PUT /api/pg/profile — update editable fields
router.put("/profile", protect, pgStudentOnly, checkPgDeadline, async (req, res) => {
  try {
    const { name, roll_number, mobile, hostel, programme } = req.body;
    const update = {};
    if (name !== undefined) update.name = String(name).trim();
    if (roll_number !== undefined) update.roll_number = String(roll_number).trim();
    if (mobile !== undefined) update.mobile = String(mobile).trim();
    if (hostel !== undefined) update.hostel = String(hostel).trim();
    if (programme !== undefined) update.programme = programme || null;

    const student = await PgStudent.findByIdAndUpdate(req.user.id, update, {
      new: true,
      runValidators: true,
    });
    if (!student) return res.status(404).json({ message: "PG Student not found" });
    res.json({ message: "Profile updated", student });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /api/pg/upload/photo — upload profile photo (original, no resize)
router.post("/upload/photo", protect, pgStudentOnly, (req, res) => {
  uploadPgPhoto(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      // Check deadline after upload so we can clean up the file if expired
      const deadline = await PgDeadline.findOne({ is_active: true }).sort({ deadline_date: -1 });
      if (deadline && new Date() > new Date(deadline.deadline_date)) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({
          message: "Deadline has passed. You can no longer upload photos.",
          deadline: deadline.deadline_date,
        });
      }

      const student = await PgStudent.findById(req.user.id);
      if (!student) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: "PG Student not found" });
      }

      // Delete old photo if it exists
      if (student.profile_photo) {
        const oldPath = path.join(process.cwd(), "uploads", "pg-images", student.profile_photo);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch {}
        }
      }

      // Store original file as-is — no cropping or resizing
      student.profile_photo = req.file.filename;
      student.is_registered = !!(student.name && student.roll_number && student.mobile && student.programme && req.file.filename);
      await student.save();

      res.json({
        message: "Photo uploaded successfully",
        filename: req.file.filename,
        student,
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      res.status(500).json({ message: "Error saving photo", error: error.message });
    }
  });
});

export default router;
