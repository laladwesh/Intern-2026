import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const pgImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/pg-images";
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${crypto.randomBytes(18).toString("base64url")}${path.extname(file.originalname).toLowerCase()}`;
    cb(null, uniqueName);
  },
});

const imageFilter = (req, file, cb) => {
  const allowedExts = /jpeg|jpg|png/;
  const allowedMimes = /image\/jpeg|image\/jpg|image\/png/;
  const extOk = allowedExts.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowedMimes.test(file.mimetype);
  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG and PNG images are allowed for profile photo"));
  }
};

export const uploadPgPhoto = multer({
  storage: pgImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFilter,
}).single("profile_photo");
