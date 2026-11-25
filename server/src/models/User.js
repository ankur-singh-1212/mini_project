import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "agent", "admin"], default: "user" },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
userSchema.index({ role: 1 });
export default mongoose.model("User", userSchema);
