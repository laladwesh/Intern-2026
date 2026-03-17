import express from "express";
import Student from "../models/Student.model.js";
import Admin from "../models/Admin.model.js";
import Deadline from "../models/Deadline.model.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { uploadExcel } from "../middleware/upload.js";
import xlsx from "xlsx";
import fs from "fs";

const router = express.Router();

// ==================== STUDENT MANAGEMENT ====================

// @route   GET /api/admin/students
// @desc    Get all students (with optional filters)
router.get("/students", protect, adminOnly, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      major,
      programme,
      status,
      registration_complete,
      search,
    } = req.query;

    const filter = {};
    if (major) filter.major = major;
    if (programme) filter.programme = programme;
    if (status) filter.status = status;
    if (registration_complete !== undefined)
      filter.registration_complete = registration_complete === "true";
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { roll_number: isNaN(search) ? undefined : Number(search) },
      ].filter((q) => Object.values(q)[0] !== undefined);
    }

    const students = await Student.find(filter)
      .select("-__v")
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ roll_number: 1 });

    const total = await Student.countDocuments(filter);

    res.json({
      students,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/admin/students/:id
// @desc    Get single student by ID
router.get("/students/:id", protect, adminOnly, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select(
      "-__v"
    );
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   PUT /api/admin/students/:id
// @desc    Admin can update any field of a student
router.put("/students/:id", protect, adminOnly, async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).select("-__v");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({ message: "Student updated successfully", student });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   DELETE /api/admin/students/:id
// @desc    Delete a student
router.delete("/students/:id", protect, adminOnly, async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   POST /api/admin/students
// @desc    Admin manually add a single student
router.post("/students", protect, adminOnly, async (req, res) => {
  try {
    const { email, roll_number } = req.body;

    // Check duplicates
    const existing = await Student.findOne({
      $or: [{ email }, { roll_number }],
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Student with this email or roll number already exists" });
    }

    const student = await Student.create(req.body);
    res.status(201).json({ message: "Student added successfully", student });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ==================== BULK UPLOAD ====================

// Required Excel columns for bulk upload
const BULK_UPLOAD_COLUMNS = [
  "roll_number",
  "name",
  "email",
  "major",
  "programme",
  "major_cpi",
  "year_of_admission",
];

// @route   POST /api/admin/students/bulk-upload
// @desc    Bulk upload students from Excel file
router.post(
  "/students/bulk-upload",
  protect,
  adminOnly,
  uploadExcel,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Please upload an Excel file" });
      }

      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet);

      if (data.length === 0) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Excel file is empty" });
      }

      // Validate columns
      const fileColumns = Object.keys(data[0]);
      const missingColumns = BULK_UPLOAD_COLUMNS.filter(
        (col) => !fileColumns.includes(col)
      );
      if (missingColumns.length > 0) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          message: `Missing required columns: ${missingColumns.join(", ")}`,
          required_columns: BULK_UPLOAD_COLUMNS,
        });
      }

      const results = { success: 0, failed: 0, errors: [] };

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          // Only pick allowed bulk upload fields
          const studentData = {};
          const allowedFields = [
            "roll_number",
            "name",
            "email",
            "major",
            "minor",
            "programme",
            "major_cpi",
            "minor_cpi",
            "year_of_admission",
            "year_of_minor_admission",
            // Semester SPIs
            "spi_1", "spi_2", "spi_3", "spi_4", "spi_5", "spi_6",
            "spi_7", "spi_8", "spi_9", "spi_10", "spi_11", "spi_12",
          ];

          for (const field of allowedFields) {
            if (row[field] !== undefined && row[field] !== "") {
              // Handle SPI fields
              if (field.startsWith("spi_")) {
                if (!studentData.semester_wise_spi) {
                  studentData.semester_wise_spi = {};
                }
                studentData.semester_wise_spi[field] = String(row[field]);
              } else {
                studentData[field] = row[field];
              }
            }
          }

          // Check if student already exists (update if exists)
          const existingStudent = await Student.findOne({
            $or: [
              { email: studentData.email },
              { roll_number: studentData.roll_number },
            ],
          });

          if (existingStudent) {
            // Update existing student's non-editable fields
            await Student.findByIdAndUpdate(existingStudent._id, studentData, {
              runValidators: true,
            });
          } else {
            await Student.create(studentData);
          }
          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push({
            row: i + 2, // Excel row (1-indexed + header)
            email: row.email,
            error: err.message,
          });
        }
      }

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json({
        message: "Bulk upload complete",
        results,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// @route   GET /api/admin/students/bulk-upload/template
// @desc    Download Excel template for bulk upload
router.get(
  "/students/bulk-upload/template",
  protect,
  adminOnly,
  (req, res) => {
    const templateData = [
      {
        roll_number: "220101001",
        name: "John Doe",
        email: "john@iitg.ac.in",
        major: "CSE",
        programme: "BTech",
        major_cpi: "8.5",
        year_of_admission: "2022",
        minor: "",
        minor_cpi: "",
        year_of_minor_admission: "",
        spi_1: "",
        spi_2: "",
        spi_3: "",
        spi_4: "",
        spi_5: "",
        spi_6: "",
        spi_7: "",
        spi_8: "",
      },
    ];

    const worksheet = xlsx.utils.json_to_sheet(templateData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Students");

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=bulk_upload_template.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  }
);

// ==================== DEADLINE MANAGEMENT ====================

// @route   POST /api/admin/deadlines
// @desc    Create a new deadline
router.post("/deadlines", protect, adminOnly, async (req, res) => {
  try {
    const { title, description, deadline_date } = req.body;

    if (!title || !deadline_date) {
      return res
        .status(400)
        .json({ message: "Title and deadline date are required" });
    }

    await Deadline.updateMany({ is_active: true }, { $set: { is_active: false } });

    const deadline = await Deadline.create({
      title,
      description,
      deadline_date,
      is_active: true,
      created_by: req.user.id,
    });

    res.status(201).json({ message: "Deadline created", deadline });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/admin/deadlines
// @desc    Get all deadlines
router.get("/deadlines", protect, adminOnly, async (req, res) => {
  try {
    const deadlines = await Deadline.find()
      .populate("created_by", "name email")
      .sort({ deadline_date: -1 });
    res.json(deadlines);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   PUT /api/admin/deadlines/:id
// @desc    Update a deadline
router.put("/deadlines/:id", protect, adminOnly, async (req, res) => {
  try {
    const deadline = await Deadline.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!deadline) {
      return res.status(404).json({ message: "Deadline not found" });
    }
    res.json({ message: "Deadline updated", deadline });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   DELETE /api/admin/deadlines/:id
// @desc    Delete a deadline
router.delete("/deadlines/:id", protect, adminOnly, async (req, res) => {
  try {
    const deadline = await Deadline.findByIdAndDelete(req.params.id);
    if (!deadline) {
      return res.status(404).json({ message: "Deadline not found" });
    }
    res.json({ message: "Deadline deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ==================== ADMIN MANAGEMENT ====================

// @route   POST /api/admin/manage
// @desc    Add a new admin
router.post("/manage", protect, adminOnly, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Admin with this email already exists" });
    }

    const newAdmin = await Admin.create({
      name,
      email,
      role: "admin",
    });

    res.status(201).json({ message: "Admin added successfully", admin: newAdmin });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/admin/manage
// @desc    Get all admins
router.get("/manage", protect, adminOnly, async (req, res) => {
  try {
    const admins = await Admin.find().select("-__v");
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   DELETE /api/admin/manage/:id
// @desc    Remove an admin
router.delete("/manage/:id", protect, adminOnly, async (req, res) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "You cannot remove yourself" });
    }

    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    res.json({ message: "Admin removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ==================== STATS ====================

// @route   GET /api/admin/stats
// @desc    Get dashboard statistics
router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const registeredStudents = await Student.countDocuments({
      is_registered: true,
    });
    const completedRegistration = await Student.countDocuments({
      registration_complete: true,
    });
    const placedStudents = await Student.countDocuments({
      status: "Placed_Student",
    });
    const activeDeadline = await Deadline.findOne({ is_active: true }).sort({
      deadline_date: -1,
    });

    res.json({
      totalStudents,
      registeredStudents,
      completedRegistration,
      placedStudents,
      pendingRegistration: totalStudents - registeredStudents,
      activeDeadline,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
