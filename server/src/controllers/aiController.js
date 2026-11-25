import { predictCategory, predictPriority } from "../services/predictionService.js";

export const categorize = async (req, res) => {
  const { text, category } = req.body;
  if (!text) return res.status(400).json({ success: false, message: "text required" });
  const cat = await predictCategory(text);
  const prio = predictPriority(text, category || cat.category);
  res.json({ success: true, data: { category: cat, priority: prio } });
};

export const predictPrio = async (req, res) => {
  const { text, category } = req.body;
  if (!text) return res.status(400).json({ success: false, message: "text required" });
  const prio = predictPriority(text, category);
  res.json({ success: true, data: prio });
};
