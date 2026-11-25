import Department from "../models/Department.js";

export const listDepartments = async (req, res) => {
  const items = await Department.find({ isActive: { $ne: false } }).sort({ name: 1 });
  res.json({ success: true, data: items });
};

export const createDepartment = async (req, res) => {
  const d = await Department.create(req.body);
  res.status(201).json({ success: true, department: d });
};

export const updateDepartment = async (req, res) => {
  const d = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!d) return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, department: d });
};

export const deleteDepartment = async (req, res) => {
  await Department.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true });
};
