import mongoose from "mongoose";
import validator from "validator";

const pgStudentSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      validate: {
        validator: validator.isEmail,
        message: "Invalid email address",
      },
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    outlook_id: {
      type: String,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      default: "",
      trim: true,
    },
    roll_number: {
      type: String,
      default: "",
      trim: true,
    },
    mobile: {
      type: String,
      default: "",
      trim: true,
    },
    hostel: {
      type: String,
      default: "",
      trim: true,
    },
    // ObjectId stored as string — matches _id in placement portal's programmes collection
    // Use mongoose.Schema.Types.ObjectId so it round-trips cleanly when migrating
    programme: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      // ref: "programme"  — uncomment when migrating to the main placement-portal DB
    },
    profile_photo: {
      type: String,
      default: null,
    },
    is_registered: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const PgStudent = mongoose.model("pg_student", pgStudentSchema);
export default PgStudent;
