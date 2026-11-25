import SLAConfig from "../models/SLAConfig.js";
import { ensureDefaultSLA } from "../services/slaService.js";

export const getSLA = async (req, res) => {
  await ensureDefaultSLA();
  const items = await SLAConfig.find().sort({ priority: 1 });
  res.json({ success: true, data: items });
};

export const updateSLA = async (req, res) => {
  const { priority } = req.params;
  const { responseMinutes, resolutionMinutes, escalationEnabled, atRiskPercent, description } = req.body;
  const cfg = await SLAConfig.findOneAndUpdate(
    { priority },
    { responseMinutes, resolutionMinutes, escalationEnabled, atRiskPercent, description, updatedBy: req.user._id },
    { new: true, upsert: true }
  );
  res.json({ success: true, config: cfg });
};
