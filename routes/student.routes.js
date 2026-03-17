import express from "express";
import Student from "../models/Student.model.js";
import Deadline from "../models/Deadline.model.js";
import {
  protect,
  studentOnly,
  checkDeadline,
} from "../middleware/auth.js";
import { uploadProfilePic, uploadCV } from "../middleware/upload.js";

const router = express.Router();
const API_PREFIX =
  process.env.NODE_ENV === "production"
    ? `${process.env.APP_BASE_PATH || "/intern-2026"}/api`
    : "/api";

// Fields that students CANNOT edit (set by admin)
const NON_EDITABLE_FIELDS = [
  "roll_number",
  "name",
  "email",
  "major_cpi",
  "minor_cpi",
  "major",
  "minor",
  "year_of_admission",
  "year_of_minor_admission",
  "programme",
  "semester_wise_spi",
  // System fields
  "max_profiles",
  "fee_paid",
  "fee_remaining",
  "status",
  "backlogs",
  "cv_verified",
  "is_registered",
];

// Helper: strip non-editable fields from request body
const stripNonEditable = (body) => {
  const filtered = { ...body };
  for (const field of NON_EDITABLE_FIELDS) {
    delete filtered[field];
  }
  return filtered;
};

// @route   GET /api/student/profile
// @desc    Get own profile
router.get("/profile", protect, studentOnly, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select("-__v");
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Check deadline status
    const activeDeadline = await Deadline.findOne({ is_active: true }).sort({
      deadline_date: -1,
    });
    const canEdit =
      !activeDeadline || new Date() <= new Date(activeDeadline.deadline_date);

    res.json({ student, canEdit, deadline: activeDeadline });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   PUT /api/student/profile
// @desc    Update own profile (editable fields only, before deadline)
router.put(
  "/profile",
  protect,
  studentOnly,
  checkDeadline,
  async (req, res) => {
    try {
      const allowedUpdates = stripNonEditable(req.body);

      const student = await Student.findByIdAndUpdate(
        req.user.id,
        allowedUpdates,
        { new: true, runValidators: true }
      ).select("-__v");

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      res.json({ message: "Profile updated successfully", student });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// @route   POST /api/student/profile/complete
// @desc    Mark registration as complete (submit final details)
router.post(
  "/profile/complete",
  protect,
  studentOnly,
  checkDeadline,
  async (req, res) => {
    try {
      const student = await Student.findById(req.user.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Validate required fields for completion
      const requiredFields = ["mobile_campus", "gender", "dob"];
      const missingFields = requiredFields.filter((f) => !student[f]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          message: `Please fill in required fields: ${missingFields.join(", ")}`,
          missingFields,
        });
      }

      student.registration_complete = true;
      await student.save();

      res.json({
        message: "Registration completed successfully",
        student: await Student.findById(req.user.id).select("-__v"),
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// @route   POST /api/student/upload/profile-pic
// @desc    Upload profile picture
router.post(
  "/upload/profile-pic",
  protect,
  studentOnly,
  checkDeadline,
  (req, res) => {
    uploadProfilePic(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Please upload an image" });
      }

      try {
        const imageFileName = req.file.filename;
        const imageUrl = `${API_PREFIX}/image/${encodeURIComponent(imageFileName)}`;
        const student = await Student.findByIdAndUpdate(
          req.user.id,
          { profile_pic: imageFileName },
          { new: true }
        ).select("-__v");

        res.json({
          message: "Profile picture uploaded successfully",
          profile_pic: imageUrl,
          student,
        });
      } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });
  }
);

// @route   POST /api/student/upload/cv
// @desc    Upload CVs (tech, non_tech, core)
router.post(
  "/upload/cv",
  protect,
  studentOnly,
  checkDeadline,
  (req, res) => {
    uploadCV(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }

      if (!req.files || Object.keys(req.files).length === 0) {
        return res
          .status(400)
          .json({ message: "Please upload at least one CV file" });
      }

      try {
        const updateData = {};
        const uploadedFiles = [];

        if (req.files.cv_tech && req.files.cv_tech[0]) {
          updateData["cv.tech"] = req.files.cv_tech[0].filename;
          uploadedFiles.push({
            type: "cv_tech",
            url: `${API_PREFIX}/cv/${encodeURIComponent(req.files.cv_tech[0].filename)}`,
          });
        }
        if (req.files.cv_non_tech && req.files.cv_non_tech[0]) {
          updateData["cv.non_tech"] = req.files.cv_non_tech[0].filename;
          uploadedFiles.push({
            type: "cv_non_tech",
            url: `${API_PREFIX}/cv/${encodeURIComponent(req.files.cv_non_tech[0].filename)}`,
          });
        }
        if (req.files.cv_core && req.files.cv_core[0]) {
          updateData["cv.core"] = req.files.cv_core[0].filename;
          uploadedFiles.push({
            type: "cv_core",
            url: `${API_PREFIX}/cv/${encodeURIComponent(req.files.cv_core[0].filename)}`,
          });
        }

        const student = await Student.findByIdAndUpdate(
          req.user.id,
          updateData,
          { new: true }
        ).select("-__v");

        res.json({
          message: "CV(s) uploaded successfully",
          files: uploadedFiles,
          student,
        });
      } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });
  }
);

// @route   PUT /api/student/cv-links
// @desc    Update CV links (drive, portfolio)
router.put(
  "/cv-links",
  protect,
  studentOnly,
  checkDeadline,
  async (req, res) => {
    try {
      const { drive_Link, portfolio_Link } = req.body;
      const updateData = {};

      if (drive_Link !== undefined) updateData["cv.drive_Link"] = drive_Link;
      if (portfolio_Link !== undefined)
        updateData["cv.portfolio_Link"] = portfolio_Link;

      const student = await Student.findByIdAndUpdate(
        req.user.id,
        updateData,
        { new: true, runValidators: true }
      ).select("-__v");

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      res.json({ message: "CV links updated successfully", student });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// @route   GET /api/student/deadline
// @desc    Get active deadline info
router.get("/deadline", protect, studentOnly, async (req, res) => {
  try {
    const activeDeadline = await Deadline.findOne({ is_active: true }).sort({
      deadline_date: -1,
    });

    if (!activeDeadline) {
      return res.json({ message: "No active deadline", canEdit: true });
    }

    const canEdit = new Date() <= new Date(activeDeadline.deadline_date);

    res.json({
      deadline: activeDeadline,
      canEdit,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
