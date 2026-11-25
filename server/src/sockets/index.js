import jwt from "jsonwebtoken";
import { verifyToken } from "../utils/jwt.js";
import User from "../models/User.js";
import Complaint from "../models/Complaint.js";

function idOf(x) { return x?._id ? x._id.toString() : (x ? x.toString() : null); }
function canView(user, c) {
  if (user.role === "admin") return true;
  if (idOf(c.reporter) === user._id.toString()) return true;
  if (idOf(c.assignedAgent) === user._id.toString()) return true;
  return false;
}

export function initSockets(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error("unauthorized"));
      const payload = verifyToken(token);
      const user = await User.findById(payload.id).select("-password");
      if (!user || !user.isActive) return next(new Error("unauthorized"));
      socket.user = user;
      next();
    } catch (e) {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user._id.toString()}`);
    if (socket.user.role === "admin") socket.join("admins");

    socket.on("complaint:join", async (complaintId, ack) => {
      try {
        const c = await Complaint.findById(complaintId);
        if (!c || !canView(socket.user, c)) {
          ack?.({ ok: false });
          return;
        }
        socket.join(`complaint:${complaintId}`);
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false });
      }
    });

    socket.on("complaint:leave", (complaintId) => {
      socket.leave(`complaint:${complaintId}`);
    });

    socket.on("disconnect", () => {});
  });
}
