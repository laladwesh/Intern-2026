import mongoose from "mongoose";

const pgDeadlineSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "PG Photo Submission Deadline",
    },
    description: {
      type: String,
      default: "PG students must upload their profile photo before this deadline",
    },
    deadline_date: {
      type: Date,
      required: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const PgDeadline = mongoose.model("pg_deadline", pgDeadlineSchema);
export default PgDeadline;
