import Notification from "../models/Notification.js";

export const listNotifications = async (req, res) => {
  const { unread, page = 1, limit = 20 } = req.query;
  const filter = { user: req.user._id };
  if (unread === "true") filter.read = false;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  const total = await Notification.countDocuments(filter);
  const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
  const items = await Notification.find(filter).sort({ createdAt: -1 }).skip((p-1)*l).limit(l);
  res.json({ success: true, data: items, unreadCount, pagination: { page: p, limit: l, total, pages: Math.ceil(total/l) } });
};

export const markRead = async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true }, { new: true });
  if (!n) return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, notification: n });
};

export const markAllRead = async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ success: true });
};
