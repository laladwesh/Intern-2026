import mongoose from "mongoose";
const { Schema } = mongoose;
import validator from "validator";
import "mongoose-type-url";
import bcrypt from "bcryptjs";

const studentSchema = new Schema(
  {
    // ===== NON-EDITABLE FIELDS (set by admin during bulk upload) =====
    roll_number: {
      type: Number,
      unique: true,
    },
    name: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      validate: validator.isEmail,
      required: true,
      unique: true,
    },
    major_cpi: {
      type: Number,
      required: false,
      max: [10, "CPI can not be more than 10"],
    },
    minor_cpi: {
      type: Number,
      max: [10, "CPI can not be more than 10"],
    },
    major: {
      type: String,
      required: false,
    },
    minor: {
      type: String,
    },
    year_of_admission: {
      type: Number,
    },
    year_of_minor_admission: {
      type: Number,
    },
    programme: {
      type: String,
      enum: {
        values: ["BTech", "BDes", "MTech", "MDes", "MSc", "MA", "PhD", "Dual"],
        message: "{VALUE} is not supported in programme field",
      },
    },
    semester_wise_spi: {
      spi_1: { type: String },
      spi_2: { type: String },
      spi_3: { type: String },
      spi_4: { type: String },
      spi_5: { type: String },
      spi_6: { type: String },
      spi_7: { type: String },
      spi_8: { type: String },
      spi_9: { type: String },
      spi_10: { type: String },
      spi_11: { type: String },
      spi_12: { type: String },
    },

    // ===== EDITABLE FIELDS (student can update these) =====
    password: {
      type: String,
      minlength: 6,
    },
    alt_email: {
      type: String,
    },
    gender: {
      type: String,
      enum: {
        values: ["Male", "Female", "Other"],
        message: "{VALUE} is not supported in gender field",
      },
      required: false,
    },
    dob: {
      type: Date,
      required: false,
    },
    nationality: {
      type: String,
      default: "Indian",
    },
    hostel: {
      type: String,
    },
    room_number: {
      type: String,
    },
    mobile_campus: {
      type: Number,
      min: [1000000000, "Invalid mobile number."],
      max: [9999999999, "Invalid mobile number."],
      required: false,
    },
    mobile_campus_alt: {
      type: Number,
      min: [1000000000, "Invalid mobile number."],
      max: [9999999999, "Invalid mobile number."],
    },
    mobile_home: {
      type: Number,
      min: [1000000000, "Invalid mobile number."],
      max: [9999999999, "Invalid mobile number."],
    },
    disability: {
      type: String,
    },
    linkedin_url: {
      type: mongoose.SchemaTypes.Url,
    },
    flat_no: {
      type: String,
    },
    address: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    pincode: {
      type: Number,
    },
    category: {
      type: String,
      enum: {
        values: [
          "General",
          "SC",
          "ST",
          "Gen-EWS",
          "OBC-NCL",
          "General-PwD",
          "SC-PwD",
          "ST-PwD",
          "OBC-PwD",
          "EWS-PwD",
        ],
        message: "{VALUE} is not supported in category field",
      },
      required: false,
    },
    schooling: {
      x_percentage: {
        type: Number,
        default: 0.0,
        min: [0, "Percentage X can not be lower than 0"],
        max: [100, "Percentage X can not be more than 100"],
      },
      x_pass_year: { type: Number },
      x_board: { type: String },
      x_exam_medium: { type: String },
      xii_percentage: {
        type: Number,
        default: 0.0,
        min: [0, "Percentage XII can not be lower than 0"],
        max: [100, "Percentage XII can not be more than 100"],
      },
      xii_pass_year: { type: Number },
      xii_exam_board: { type: String },
      xii_exam_medium: { type: String },
      gap: { type: Number },
      reason_gap: { type: String },
    },
    profile_pic: {
      type: String, // file path
    },
    cv: {
      tech: { type: String },    // file path
      non_tech: { type: String }, // file path
      core: { type: String },    // file path
      drive_Link: { type: String },
      portfolio_Link: { type: String },
    },
    jee_ma_gate_rank: {
      type: Number,
      required: false,
    },
    rank_category: {
      type: String,
      required: false,
    },
    entrance_examination: {
      type: String,
    },

    // ===== SYSTEM FIELDS =====
    max_profiles: {
      type: Number,
      default: 55,
      required: true,
    },
    fee_paid: {
      type: Boolean,
      default: false,
      required: true,
    },
    fee_remaining: {
      type: Number,
      default: 2000,
    },
    status: {
      type: String,
      enum: {
        values: ["Placed_Student", "Sitting_Placement", "Blocked"],
        message: "{VALUE} is not supported in status field",
      },
      required: true,
      default: "Sitting_Placement",
    },
    backlogs: {
      type: Number,
      required: true,
      default: 0,
    },
    cv_verified: {
      type: Boolean,
      default: false,
      required: true,
    },
    registration_complete: {
      type: Boolean,
      default: false,
    },
    is_registered: {
      type: Boolean,
      default: false, // becomes true after student signs up with password
    },
  },
  { timestamps: true }
);

// Hash password before save
studentSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
studentSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const Student = mongoose.model("student", studentSchema);
export default Student;
