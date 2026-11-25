import Notification from "../models/Notification.js";

export async function createNotification({ userId, type, title, message, link, complaintId, io }) {
  const n = await Notification.create({
    user: userId,
    type,
    title,
    message,
    link,
    complaint: complaintId,
  });
  if (io) {
    io.to(`user:${userId}`).emit("notification:new", {
      id: n._id.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt,
    });
  }
  return n;
}
