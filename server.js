import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import fs from "fs";
import connectDB from "./config/db.js";
import SharedFile from "./models/SharedFile.model.js";

// Route imports
import authRoutes from "./routes/auth.routes.js";
import adminAuthRoutes from "./routes/admin.auth.routes.js";
import studentAuthRoutes from "./routes/student.auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import studentRoutes from "./routes/student.routes.js";
import shareRoutes from "./routes/share.routes.js";

// Utilities
import { startCleanupService } from "./utils/cleanupService.js";

// Load env vars
dotenv.config();

// Connect to MongoDB
connectDB();

// Start cleanup service for shared files
startCleanupService();

const app = express();
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const normalizeBasePath = (basePath) => {
  if (!basePath || basePath === "/") return "";
  let normalized = basePath.trim();
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  if (normalized.endsWith("/")) normalized = normalized.slice(0, -1);
  return normalized;
};

const APP_BASE_PATH = normalizeBasePath(process.env.APP_BASE_PATH || "/intern-2026");
const API_BASE_PATH = `${APP_BASE_PATH}/api`;
const API_COMPAT_PATH = "/api";
const corsOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((origin) => origin.trim())
  : true;

// Middleware
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sendUploadFile = (folderName) => {
  return (req, res) => {
    const { filename } = req.params;
    const isSafeFileName = /^[A-Za-z0-9._-]+$/.test(filename);
    if (!isSafeFileName) {
      return res.status(400).json({ message: "Invalid file name" });
    }

    const filePath = path.join(process.cwd(), "uploads", folderName, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    return res.sendFile(filePath);
  };
};

const sendSharedFile = async (req, res, next) => {
  try {
    const { key } = req.params;
    const isSafeKey = /^[A-Za-z0-9._-]+$/.test(key);
    if (!isSafeKey) {
      return res.status(400).json({ message: "Invalid file name" });
    }

    const sharedFile = await SharedFile.findOne({ shareUrl: key });
    if (sharedFile) {
      if (!sharedFile.isPermanent && new Date() > new Date(sharedFile.expiresAt)) {
        return res.status(410).json({ message: "File has expired" });
      }

      const sharedFilePath = path.join(process.cwd(), "uploads", "shared-files", sharedFile.fileName);
      if (!fs.existsSync(sharedFilePath)) {
        return res.status(404).json({ message: "File not found" });
      }

      sharedFile.downloadCount += 1;
      await sharedFile.save();

      return res.sendFile(sharedFilePath);
    }

    const filePath = path.join(process.cwd(), "uploads", "shared-files", key);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    return res.sendFile(filePath);
  } catch (error) {
    return next(error);
  }
};

app.get(`${API_BASE_PATH}/image/:filename`, sendUploadFile("profile_pics"));
app.get(`${API_BASE_PATH}/cv/:filename`, sendUploadFile("cvs"));
app.get(`${API_BASE_PATH}/shared/:key`, sendSharedFile);
app.get(`${API_COMPAT_PATH}/image/:filename`, sendUploadFile("profile_pics"));
app.get(`${API_COMPAT_PATH}/cv/:filename`, sendUploadFile("cvs"));
app.get(`${API_COMPAT_PATH}/shared/:filename`, sendUploadFile("shared-files"));

// Routes
app.use(`${API_BASE_PATH}/auth`, authRoutes);
app.use(`${API_BASE_PATH}/admin/auth`, adminAuthRoutes);
app.use(`${API_BASE_PATH}/student/auth`, studentAuthRoutes);
app.use(`${API_BASE_PATH}/admin`, adminRoutes);
app.use(`${API_BASE_PATH}/student`, studentRoutes);
app.use(`${API_BASE_PATH}/share`, shareRoutes);
app.use(`${API_COMPAT_PATH}/auth`, authRoutes);
app.use(`${API_COMPAT_PATH}/admin/auth`, adminAuthRoutes);
app.use(`${API_COMPAT_PATH}/student/auth`, studentAuthRoutes);
app.use(`${API_COMPAT_PATH}/admin`, adminRoutes);
app.use(`${API_COMPAT_PATH}/student`, studentRoutes);
app.use(`${API_COMPAT_PATH}/share`, shareRoutes);

app.get(`${API_BASE_PATH}/health`, (req, res) => {
  res.json({ message: "CCD Intern 2026 API is running" });
});
app.get(`${API_COMPAT_PATH}/health`, (req, res) => {
  res.json({ message: "CCD Intern 2026 API is running" });
});

app.get(`${API_BASE_PATH}/test`, (req, res) => {
  res.json({
    ok: true,
    message: "Test API route is working",
    path: `${API_BASE_PATH}/test`,
    timestamp: new Date().toISOString(),
  });
});

app.get(`${API_COMPAT_PATH}/test`, (req, res) => {
  res.json({
    ok: true,
    message: "Test API route is working",
    path: `${API_COMPAT_PATH}/test`,
    timestamp: new Date().toISOString(),
  });
});

if (IS_PRODUCTION) {
  const frontendBuildPath = path.join(process.cwd(), "frontend", "build");
  if (APP_BASE_PATH) {
    app.use(APP_BASE_PATH, express.static(frontendBuildPath));

    const escapedBasePath = APP_BASE_PATH.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const basePathCatchAll = new RegExp(`^${escapedBasePath}(?!/api(?:/|$))(?:/.*)?$`);

    app.get(basePathCatchAll, (req, res) => {
      res.sendFile(path.join(frontendBuildPath, "index.html"));
    });
  } else {
    app.use(express.static(frontendBuildPath));
    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(frontendBuildPath, "index.html"));
    });
  }
} else {
  app.get("/", (req, res) => {
    res.json({
      message: "Backend running in development mode",
      frontend: "http://localhost:3000",
      api: "http://localhost:5000/intern-2026/api",
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!", error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
