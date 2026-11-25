import mongoose from "mongoose";
const slaSchema = new mongoose.Schema(
  {
    priority: { type: String, required: true, unique: true },
    responseMinutes: { type: Number, required: true },
    resolutionMinutes: { type: Number, required: true },
    escalationEnabled: { type: Boolean, default: true },
    atRiskPercent: { type: Number, default: 80 },
    description: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);
export default mongoose.model("SLAConfig", slaSchema);
