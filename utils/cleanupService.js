import schedule from "node-schedule";
import fs from "fs";
import path from "path";
import SharedFile from "../models/SharedFile.model.js";

// Run cleanup every 5 minutes
export const startCleanupService = () => {
  console.log("Starting file cleanup service...");
  
  // Run immediately on start
  performCleanup();
  
  // Schedule to run every 5 minutes
  schedule.scheduleJob("*/5 * * * *", () => {
    performCleanup();
  });
};

const performCleanup = async () => {
  try {
    const now = new Date();
    const expiredFiles = await SharedFile.find({
      isPermanent: false,
      expiresAt: { $lt: now }
    });
    
    if (expiredFiles.length === 0) {
      console.log("✓ No expired files to clean up");
      return;
    }
    
    let deletedCount = 0;
    
    for (const file of expiredFiles) {
      const filePath = path.join(process.cwd(), "uploads", "shared-files", file.fileName);
      
      // Delete from disk
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted expired file: ${file.originalName}`);
      }
      
      // Delete from database
      await SharedFile.findByIdAndDelete(file._id);
      deletedCount++;
    }
    
    console.log(`✓ Cleanup completed: ${deletedCount} files deleted`);
  } catch (error) {
    console.error("Error during automatic cleanup:", error);
  }
};
