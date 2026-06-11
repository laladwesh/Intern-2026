import express from "express";
import path from "path";
import fs from "fs";
import sharp from "sharp";
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

// PUT /api/pg/profile — update name and roll_number
router.put("/profile", protect, pgStudentOnly, checkPgDeadline, async (req, res) => {
  try {
    const { name, roll_number } = req.body;
    const update = {};
    if (name !== undefined) update.name = String(name).trim();
    if (roll_number !== undefined) update.roll_number = String(roll_number).trim();

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

// POST /api/pg/upload/photo — upload profile photo (500×400, auto-resized)
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

      // Resize to exactly 500×400 (cover crop centered)
      const processedPath = req.file.path + ".processed";
      await sharp(req.file.path)
        .resize(500, 400, { fit: "cover", position: "center" })
        .jpeg({ quality: 90 })
        .toFile(processedPath);

      fs.unlinkSync(req.file.path);

      // Replace extension with .jpg since we always output JPEG
      const finalFilename = req.file.filename.replace(/\.[^.]+$/, ".jpg");
      const finalPath = path.join(path.dirname(req.file.path), finalFilename);
      fs.renameSync(processedPath, finalPath);

      // Delete old photo if it exists
      const student = await PgStudent.findById(req.user.id);
      if (!student) {
        fs.unlinkSync(finalPath);
        return res.status(404).json({ message: "PG Student not found" });
      }

      if (student.profile_photo) {
        const oldPath = path.join(process.cwd(), "uploads", "pg-images", student.profile_photo);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      student.profile_photo = finalFilename;
      student.is_registered = !!(student.name && student.roll_number && finalFilename);
      await student.save();

      res.json({
        message: "Photo uploaded and resized to 500×400 successfully",
        filename: finalFilename,
        student,
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      res.status(500).json({ message: "Error processing image", error: error.message });
    }
  });
});

export default router;
