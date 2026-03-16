import dotenv from "dotenv";
import mongoose from "mongoose";
import Admin from "./models/Admin.model.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    // Check if admin already exists
    const existing = await Admin.findOne({ role: "admin" });
    if (existing) {
      console.log("Admin already exists:", existing.email);
      process.exit(0);
    }

    // Create admin - change these to your details
    const admin = await Admin.create({
      name: "Admin",
      email: "admin@iitg.ac.in", // CHANGE THIS to your Outlook email
      role: "admin",
    });

    console.log("Admin created successfully:", admin.email);
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error.message);
    process.exit(1);
  }
};

seedAdmin();
