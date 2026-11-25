import jwt from "jsonwebtoken";
export function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, email: user.email },
    process.env.JWT_SECRET || "dev-secret-change-me",
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}
export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET || "dev-secret-change-me");
}
