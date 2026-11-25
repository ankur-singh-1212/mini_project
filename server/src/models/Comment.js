import mongoose from "mongoose";
const commentSchema = new mongoose.Schema(
  {
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true },
    isInternal: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export default mongoose.model("Comment", commentSchema);
