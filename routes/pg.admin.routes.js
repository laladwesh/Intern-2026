import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import xlsx from "xlsx";
import archiver from "archiver";
import PgStudent from "../models/PgStudent.model.js";
import PgDeadline from "../models/PgDeadline.model.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = express.Router();

// CSV/Excel upload config (temp storage, deleted after processing)
const csvStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/excel";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `pg_csv_${Date.now()}${path.extname(file.originalname)}`);
  },
});

const uploadCsvFile = multer({
  storage: csvStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".csv", ".xlsx", ".xls"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV (.csv) and Excel (.xlsx, .xls) files are allowed"));
    }
  },
}).single("file");

// GET /api/admin/pg/students — list all PG students
router.get("/students", protect, adminOnly, async (req, res) => {
  try {
    const students = await PgStudent.find().sort({ createdAt: -1 }).select("-__v");
    const total = students.length;
    const withPhoto = students.filter((s) => s.profile_photo).length;
    res.json({ students, total, withPhoto, pending: total - withPhoto });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /api/admin/pg/upload-csv — bulk import emails from CSV/Excel
router.post("/upload-csv", protect, adminOnly, (req, res) => {
  uploadCsvFile(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    try {
      const workbook = xlsx.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

      // Clean up temp file
      try { fs.unlinkSync(req.file.path); } catch {}

      if (rows.length === 0) {
        return res.status(400).json({ message: "File is empty or has no data rows" });
      }

      const results = { success: 0, skipped: 0, errors: [] };

      for (const row of rows) {
        // Locate email column case-insensitively
        const emailKey = Object.keys(row).find((k) => k.toLowerCase().trim() === "email");
        if (!emailKey) {
          results.errors.push('No "email" column found in row');
          continue;
        }

        const email = String(row[emailKey]).trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          results.errors.push(`Invalid email skipped: "${email}"`);
          continue;
        }

        try {
          const existing = await PgStudent.findOne({ email });
          if (existing) {
            results.skipped++;
          } else {
            await PgStudent.create({ email });
            results.success++;
          }
        } catch (dbErr) {
          results.errors.push(`DB error for "${email}": ${dbErr.message}`);
        }
      }

      res.json({
        message: `CSV processed. ${results.success} added, ${results.skipped} already existed.`,
        results,
      });
    } catch (error) {
      try { fs.unlinkSync(req.file.path); } catch {}
      res.status(500).json({ message: "Error processing file", error: error.message });
    }
  });
});

// GET /api/admin/pg/deadline
router.get("/deadline", protect, adminOnly, async (req, res) => {
  try {
    const deadline = await PgDeadline.findOne({ is_active: true }).sort({ deadline_date: -1 });
    res.json({ deadline: deadline || null });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /api/admin/pg/deadline — create or replace active deadline
router.post("/deadline", protect, adminOnly, async (req, res) => {
  try {
    const { title, description, deadline_date } = req.body;
    if (!deadline_date) return res.status(400).json({ message: "deadline_date is required" });

    const parsed = new Date(deadline_date);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ message: "Invalid deadline_date format" });
    }

    // Deactivate all existing active deadlines
    await PgDeadline.updateMany({ is_active: true }, { is_active: false });

    const deadline = await PgDeadline.create({
      title: title?.trim() || "PG Photo Submission Deadline",
      description: description?.trim() || "PG students must upload their profile photo before this deadline",
      deadline_date: parsed,
      is_active: true,
    });

    res.json({ message: "PG deadline set successfully", deadline });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// DELETE /api/admin/pg/deadline — clear/deactivate current deadline
router.delete("/deadline", protect, adminOnly, async (req, res) => {
  try {
    await PgDeadline.updateMany({ is_active: true }, { is_active: false });
    res.json({ message: "PG deadline cleared" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/admin/pg/download-photos — ZIP of all uploaded PG photos
router.get("/download-photos", protect, adminOnly, async (req, res) => {
  try {
    const students = await PgStudent.find({ profile_photo: { $ne: null } });

    if (students.length === 0) {
      return res.status(404).json({ message: "No photos have been uploaded yet" });
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="pg-photos-${Date.now()}.zip"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => { throw err; });
    archive.pipe(res);

    for (const student of students) {
      const photoPath = path.join(process.cwd(), "uploads", "pg-images", student.profile_photo);
      if (fs.existsSync(photoPath)) {
        const ext = path.extname(student.profile_photo);
        // Name file as: rollnumber_email.ext for easy identification
        const safeIdentifier = (student.roll_number || student.email).replace(/[^a-zA-Z0-9@._-]/g, "_");
        archive.file(photoPath, { name: `${safeIdentifier}${ext}` });
      }
    }

    archive.finalize();
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// DELETE /api/admin/pg/students/:id — remove a PG student record
router.delete("/students/:id", protect, adminOnly, async (req, res) => {
  try {
    const student = await PgStudent.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "PG Student not found" });

    if (student.profile_photo) {
      const photoPath = path.join(process.cwd(), "uploads", "pg-images", student.profile_photo);
      if (fs.existsSync(photoPath)) {
        try { fs.unlinkSync(photoPath); } catch {}
      }
    }

    await student.deleteOne();
    res.json({ message: "PG Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/admin/pg/stats — quick summary numbers
router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    const total = await PgStudent.countDocuments();
    const withPhoto = await PgStudent.countDocuments({ profile_photo: { $ne: null } });
    const deadline = await PgDeadline.findOne({ is_active: true }).sort({ deadline_date: -1 });
    res.json({ total, withPhoto, pending: total - withPhoto, deadline: deadline || null });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
