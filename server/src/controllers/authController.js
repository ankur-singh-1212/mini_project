import User from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import bcrypt from "bcryptjs";

export const register = async (req, res) => {
  const { name, email, password } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ success: false, message: "Email already registered" });
  const hashed = await bcrypt.hash(password, 10);
  let user;
  try {
    user = await User.create({ name, email, password: hashed, role: "user" });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }
    throw err;
  }
  const token = signToken(user);
  res.status(201).json({ success: true, token, user: sanitize(user) });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ success: false, message: "Invalid credentials" });
  if (!user.isActive) return res.status(403).json({ success: false, message: "Account disabled" });
  const token = signToken(user);
  res.json({ success: true, token, user: sanitize(user) });
};

export const me = async (req, res) => {
  res.json({ success: true, user: sanitize(req.user) });
};

function sanitize(u) {
  const o = u.toObject ? u.toObject() : { ...u };
  delete o.password;
  return o;
}
