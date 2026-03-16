import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Ensure upload directories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const randomFileBase = () => {
  return crypto.randomBytes(18).toString("base64url");
};

// Storage config for profile pictures
const profilePicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/profile_pics";
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${randomFileBase()}${path.extname(file.originalname).toLowerCase()}`;
    cb(null, uniqueName);
  },
});

// Storage config for CVs
const cvStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/cvs";
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${randomFileBase()}${path.extname(file.originalname).toLowerCase()}`;
    cb(null, uniqueName);
  },
});

// Storage config for bulk upload (Excel)
const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/excel";
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `bulk_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// File filters
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (jpeg, jpg, png, webp) are allowed"));
  }
};

const pdfFilter = (req, file, cb) => {
  const allowedTypes = /pdf/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  if (extname) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed for CV upload"));
  }
};

const excelFilter = (req, file, cb) => {
  const allowedTypes = /xlsx|xls/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  if (extname) {
    cb(null, true);
  } else {
    cb(new Error("Only Excel files (.xlsx, .xls) are allowed"));
  }
};

// Upload middlewares
export const uploadProfilePic = multer({
  storage: profilePicStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFilter,
}).single("profile_pic");

export const uploadCV = multer({
  storage: cvStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: pdfFilter,
}).fields([
  { name: "cv_tech", maxCount: 1 },
  { name: "cv_non_tech", maxCount: 1 },
  { name: "cv_core", maxCount: 1 },
]);

export const uploadExcel = multer({
  storage: excelStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: excelFilter,
}).single("file");
