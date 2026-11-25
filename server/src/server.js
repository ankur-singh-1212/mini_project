import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { initSockets } from "./sockets/index.js";
import { startEscalationJob } from "./jobs/slaCron.js";
import { ensureDefaultSLA } from "./services/slaService.js";
import { seedAll } from "./services/seedService.js";
import authRoutes from "./routes/authRoutes.js";
import complaintRoutes from "./routes/complaintRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";

const PORT = process.env.PORT || 5001;
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173"], credentials: true },
});
app.set("io", io);
initSockets(io);

await connectDatabase();
await ensureDefaultSLA();
if (process.env.AUTO_SEED !== "false") {
  const r = await seedAll();
  if (r.seeded) console.log("[seed] Demo data seeded. Admin: admin@nexaresolve.dev / Password123!");
}
startEscalationJob(io);

server.listen(PORT, () => {
  console.log(`NexaResolve server running on http://localhost:${PORT}`);
});

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason?.stack || reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err?.stack || err);
});

const shutdown = async () => {
  // Close Socket.IO (and its attached HTTP server) gracefully so that
  // proxied WebSocket clients see a clean close instead of an abrupt reset.
  try {
    await io.close();
  } catch {
    // best-effort during shutdown
  }
  await disconnectDatabase();
  process.exit(0);
};

process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());
