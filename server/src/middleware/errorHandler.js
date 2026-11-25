export function errorHandler(err, req, res, next) {
  console.error("[error]", err?.stack || err?.message || err);
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === "production" ? "Internal server error" : (err.message || "Internal server error");
  res.status(status).json({ success: false, message });
}
