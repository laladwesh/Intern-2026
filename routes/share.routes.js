import express from "express";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import archiver from "archiver";
import XLSX from "xlsx";
import axios from "axios";
import SharedFile from "../models/SharedFile.model.js";
import { shareAuthMiddleware, checkShareAuth } from "../middleware/shareAuth.js";
import { uploadSharedFile } from "../middleware/shareUpload.js";

const router = express.Router();

// Helper function to generate unique share URL
const generateShareUrl = async (originalName) => {
  const sanitizedName = originalName
    .replace(/[^a-zA-Z0-9.-]/g, "-")
    .replace(/--+/g, "-")
    .toLowerCase();
  
  const baseUrl = sanitizedName.substring(0, 50); // Limit length
  let shareUrl = baseUrl;
  let counter = 1;
  
  // Check if URL already exists
  while (await SharedFile.findOne({ shareUrl })) {
    shareUrl = `${baseUrl}-${counter}`;
    counter++;
  }
  
  return shareUrl;
};

// Check authentication
router.get("/auth/check", shareAuthMiddleware, checkShareAuth);

// Public route: Access file via share URL (no auth required)
router.get("/file/:shareUrl", async (req, res) => {
  try {
    const file = await SharedFile.findOne({ shareUrl: req.params.shareUrl });
    
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }
    
    // Check if file has expired
    if (!file.isPermanent && new Date() > new Date(file.expiresAt)) {
      return res.status(410).json({ message: "File has expired" });
    }
    
    const filePath = path.join(process.cwd(), "uploads", "shared-files", file.fileName);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found on disk" });
    }
    
    // Increment download count
    file.downloadCount += 1;
    await file.save();
    
    res.download(filePath, file.originalName);
  } catch (error) {
    console.error("Error downloading file via share URL:", error);
    res.status(500).json({ message: "Failed to download file" });
  }
});

// Get all files
router.get("/files", shareAuthMiddleware, async (req, res) => {
  try {
    const { search, permanent } = req.query;
    
    let query = {};
    
    if (search) {
      query.originalName = { $regex: search, $options: "i" };
    }
    
    if (permanent !== undefined) {
      query.isPermanent = permanent === "true";
    }
    
    const files = await SharedFile.find(query).sort({ createdAt: -1 });
    
    // Filter out expired temporary files
    const validFiles = files.filter(file => {
      if (file.isPermanent) return true;
      return new Date() < new Date(file.expiresAt);
    });
    
    res.json(validFiles);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ message: "Failed to fetch files" });
  }
});

// Upload file
router.post("/upload", shareAuthMiddleware, uploadSharedFile.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { isPermanent } = req.body;
    const permanent = isPermanent === "true" || isPermanent === true;
    
    // Calculate expiration (15 minutes from now if not permanent)
    const expiresAt = permanent ? null : new Date(Date.now() + 15 * 60 * 1000);
    
    // Generate unique share URL
    const shareUrl = await generateShareUrl(req.file.originalname);
    
    const sharedFile = new SharedFile({
      originalName: req.file.originalname,
      fileName: req.file.filename,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      isPermanent: permanent,
      expiresAt: expiresAt,
      shareUrl: shareUrl,
    });
    
    await sharedFile.save();
    
    res.status(201).json({
      message: "File uploaded successfully",
      file: sharedFile,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    
    // Clean up the uploaded file if database save fails
    if (req.file) {
      const filePath = path.join(process.cwd(), "uploads", "shared-files", req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.status(500).json({ message: "Failed to upload file" });
  }
});

// Download file
router.get("/download/:id", shareAuthMiddleware, async (req, res) => {
  try {
    const file = await SharedFile.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }
    
    // Check if file has expired
    if (!file.isPermanent && new Date() > new Date(file.expiresAt)) {
      return res.status(410).json({ message: "File has expired" });
    }
    
    const filePath = path.join(process.cwd(), "uploads", "shared-files", file.fileName);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found on disk" });
    }
    
    // Increment download count
    file.downloadCount += 1;
    await file.save();
    
    res.download(filePath, file.originalName);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ message: "Failed to download file" });
  }
});

// Delete file
router.delete("/files/:id", shareAuthMiddleware, async (req, res) => {
  try {
    const file = await SharedFile.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }
    
    const filePath = path.join(process.cwd(), "uploads", "shared-files", file.fileName);
    
    // Delete from disk
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete from database
    await SharedFile.findByIdAndDelete(req.params.id);
    
    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ message: "Failed to delete file" });
  }
});

// Compress image
router.post("/tools/compress-image", shareAuthMiddleware, uploadSharedFile.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }
    
    const { quality = 80 } = req.body;
    const inputPath = req.file.path;
    const outputFileName = `compressed-${req.file.filename}`;
    const outputPath = path.join(process.cwd(), "uploads", "shared-files", outputFileName);
    
    await sharp(inputPath)
      .jpeg({ quality: parseInt(quality) })
      .toFile(outputPath);
    
    const stats = fs.statSync(outputPath);
    
    // Delete original
    fs.unlinkSync(inputPath);
    
    // Create database entry for compressed file
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const shareUrl = await generateShareUrl(`compressed-${req.file.originalname}`);
    
    const sharedFile = new SharedFile({
      originalName: `compressed-${req.file.originalname}`,
      fileName: outputFileName,
      fileSize: stats.size,
      mimeType: "image/jpeg",
      isPermanent: false,
      expiresAt: expiresAt,
      shareUrl: shareUrl,
    });
    
    await sharedFile.save();
    
    res.json({
      message: "Image compressed successfully",
      file: sharedFile,
      originalSize: req.file.size,
      compressedSize: stats.size,
      reduction: ((1 - stats.size / req.file.size) * 100).toFixed(2) + "%",
    });
  } catch (error) {
    console.error("Error compressing image:", error);
    res.status(500).json({ message: "Failed to compress image" });
  }
});

// Merge PDFs
router.post("/tools/merge-pdfs", shareAuthMiddleware, uploadSharedFile.array("pdfs", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ message: "At least 2 PDF files required" });
    }
    
    const mergedPdf = await PDFDocument.create();
    
    for (const file of req.files) {
      const pdfBytes = fs.readFileSync(file.path);
      const pdf = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
      
      // Delete original
      fs.unlinkSync(file.path);
    }
    
    const mergedPdfBytes = await mergedPdf.save();
    const outputFileName = `merged-${Date.now()}.pdf`;
    const outputPath = path.join(process.cwd(), "uploads", "shared-files", outputFileName);
    
    fs.writeFileSync(outputPath, mergedPdfBytes);
    
    const stats = fs.statSync(outputPath);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const shareUrl = await generateShareUrl("merged.pdf");
    
    const sharedFile = new SharedFile({
      originalName: "merged.pdf",
      fileName: outputFileName,
      fileSize: stats.size,
      mimeType: "application/pdf",
      isPermanent: false,
      expiresAt: expiresAt,
      shareUrl: shareUrl,
    });
    
    await sharedFile.save();
    
    res.json({
      message: "PDFs merged successfully",
      file: sharedFile,
    });
  } catch (error) {
    console.error("Error merging PDFs:", error);
    
    // Cleanup uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        const filePath = file.path;
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
    
    res.status(500).json({ message: "Failed to merge PDFs" });
  }
});

// Compress files into ZIP
router.post("/tools/compress-files", shareAuthMiddleware, uploadSharedFile.array("files", 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }
    
    const outputFileName = `archive-${Date.now()}.zip`;
    const outputPath = path.join(process.cwd(), "uploads", "shared-files", outputFileName);
    const output = fs.createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    
    output.on("close", async () => {
      // Delete original files
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      
      const stats = fs.statSync(outputPath);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const shareUrl = await generateShareUrl("archive.zip");
      
      const sharedFile = new SharedFile({
        originalName: "archive.zip",
        fileName: outputFileName,
        fileSize: stats.size,
        mimeType: "application/zip",
        isPermanent: false,
        expiresAt: expiresAt,
        shareUrl: shareUrl,
      });
      
      await sharedFile.save();
      
      res.json({
        message: "Files compressed successfully",
        file: sharedFile,
      });
    });
    
    archive.on("error", (err) => {
      throw err;
    });
    
    archive.pipe(output);
    
    req.files.forEach(file => {
      archive.file(file.path, { name: file.originalname });
    });
    
    await archive.finalize();
  } catch (error) {
    console.error("Error compressing files:", error);
    
    // Cleanup uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        const filePath = file.path;
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
    
    res.status(500).json({ message: "Failed to compress files" });
  }
});

// CV Downloader - Downloads CVs from Excel and creates ZIP
router.post("/tools/cv-downloader", shareAuthMiddleware, uploadSharedFile.single("excel"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No Excel file uploaded" });
    }

    // Read Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Delete uploaded Excel file
    fs.unlinkSync(req.file.path);

    if (data.length === 0) {
      return res.status(400).json({ message: "Excel file is empty" });
    }

    // Find CV column (case-insensitive)
    const cvColumnNames = ["Resume", "resume", "cv", "CV", "Cv", "resume_", "semester_wise_spi"];
    let cvColumnName = null;

    for (const name of cvColumnNames) {
      if (data[0].hasOwnProperty(name)) {
        cvColumnName = name;
        break;
      }
    }

    if (!cvColumnName) {
      return res.status(400).json({ 
        message: "No CV column found. Expected columns: Resume, resume, cv, CV, or Cv",
        availableColumns: Object.keys(data[0])
      });
    }

    // Extract CV URLs
    const cvUrls = data
      .map(row => row[cvColumnName])
      .filter(url => url && typeof url === "string" && url.trim() !== "");

    if (cvUrls.length === 0) {
      return res.status(400).json({ message: "No CV URLs found in the Excel file" });
    }

    console.log(`Found ${cvUrls.length} CV URLs to download`);

    // Create temporary directory for CVs
    const tempDir = path.join(process.cwd(), "uploads", "shared-files", `temp-cvs-${Date.now()}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Download all CVs
    const downloadPromises = cvUrls.map(async (url, index) => {
      try {
        const response = await axios({
          method: "GET",
          url: url,
          responseType: "arraybuffer",
          timeout: 30000, // 30 seconds timeout
          headers: {
            "User-Agent": "Mozilla/5.0"
          }
        });

        // Extract filename from URL or use index
        const urlParts = url.split("/");
        let filename = urlParts[urlParts.length - 1];
        
        // If filename doesn't have extension, try to detect from content-type
        if (!filename.includes(".")) {
          const contentType = response.headers["content-type"];
          if (contentType && contentType.includes("pdf")) {
            filename = `cv-${index + 1}.pdf`;
          } else {
            filename = `cv-${index + 1}`;
          }
        }

        // Sanitize filename
        filename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");

        const filePath = path.join(tempDir, filename);
        fs.writeFileSync(filePath, response.data);

        console.log(`Downloaded: ${filename}`);
        return { success: true, filename, url };
      } catch (error) {
        console.error(`Failed to download CV from ${url}:`, error.message);
        return { success: false, url, error: error.message };
      }
    });

    const results = await Promise.all(downloadPromises);
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    if (successCount === 0) {
      // Clean up temp directory
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }
      return res.status(500).json({ message: "Failed to download any CVs" });
    }

    // Create ZIP file
    const zipFileName = `cvs-${Date.now()}.zip`;
    const zipPath = path.join(process.cwd(), "uploads", "shared-files", zipFileName);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", async () => {
      // Clean up temp directory
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }

      const stats = fs.statSync(zipPath);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const shareUrl = await generateShareUrl("cvs.zip");

      const sharedFile = new SharedFile({
        originalName: "cvs.zip",
        fileName: zipFileName,
        fileSize: stats.size,
        mimeType: "application/zip",
        isPermanent: false,
        expiresAt: expiresAt,
        shareUrl: shareUrl,
      });

      await sharedFile.save();

      res.json({
        message: "CVs downloaded and zipped successfully",
        file: sharedFile,
        successCount: successCount,
        failedCount: failedCount,
        failed: results.filter(r => !r.success).map(r => r.url),
      });
    });

    archive.on("error", (err) => {
      // Clean up temp directory
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }
      throw err;
    });

    archive.pipe(output);

    // Add all downloaded files to ZIP
    const files = fs.readdirSync(tempDir);
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      archive.file(filePath, { name: file });
    });

    await archive.finalize();
  } catch (error) {
    console.error("Error in CV downloader:", error);

    // Cleanup uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ message: "Failed to process CVs", error: error.message });
  }
});

// Cleanup expired files (manual trigger - can be called by cron)
router.post("/cleanup", shareAuthMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const expiredFiles = await SharedFile.find({
      isPermanent: false,
      expiresAt: { $lt: now }
    });
    
    let deletedCount = 0;
    
    for (const file of expiredFiles) {
      const filePath = path.join(process.cwd(), "uploads", "shared-files", file.fileName);
      
      // Delete from disk
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Delete from database
      await SharedFile.findByIdAndDelete(file._id);
      deletedCount++;
    }
    
    res.json({
      message: "Cleanup completed",
      deletedCount: deletedCount,
    });
  } catch (error) {
    console.error("Error during cleanup:", error);
    res.status(500).json({ message: "Failed to cleanup files" });
  }
});

export default router;
