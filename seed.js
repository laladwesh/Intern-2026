import dotenv from "dotenv";
import mongoose from "mongoose";
import Admin from "./models/Admin.model.js";

dotenv.config();

const SEED_ADMIN_NAME = "John Jose";
const SEED_ADMIN_EMAIL = "johnjose@iitg.ac.in";

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    const adminEmail = SEED_ADMIN_EMAIL.trim();
    if (!adminEmail) {
      throw new Error("SEED_ADMIN_EMAIL is missing. Set it in your .env file.");
    }

    // Multiple admins are allowed. Skip only if this email already exists.
    const existing = await Admin.findOne({ email: adminEmail });
    if (existing) {
      console.log("Admin already exists:", existing.email);
      process.exit(0);
    }

    // Create admin using configurable values from environment variables.
    const admin = await Admin.create({
      name: SEED_ADMIN_NAME,
      email: adminEmail,
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
