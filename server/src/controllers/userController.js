import User from "../models/User.js";
import Notification from "../models/Notification.js";

export const getProfile = async (req, res) => {
  res.json({ success: true, user: req.user });
};

export const updateProfile = async (req, res) => {
  const { name, phone } = req.body;
  if (name) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  await req.user.save();
  res.json({ success: true, user: req.user });
};

export const listUsers = async (req, res) => {
  const { role, q, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (q) filter.$or = [{ name: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }];
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  const total = await User.countDocuments(filter);
  const items = await User.find(filter).select("-password").sort({ createdAt: -1 }).skip((p-1)*l).limit(l);
  res.json({ success: true, data: items, pagination: { page: p, limit: l, total, pages: Math.ceil(total/l) } });
};

export const updateRole = async (req, res) => {
  const { role } = req.body;
  if (!["user", "agent", "admin"].includes(role)) return res.status(400).json({ success: false, message: "Invalid role" });
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ success: false, message: "User not found" });
  // prevent demoting self? optional
  u.role = role;
  await u.save();
  res.json({ success: true, user: u });
};
