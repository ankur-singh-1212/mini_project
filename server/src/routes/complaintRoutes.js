import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createComplaintSchema, updateComplaintSchema, statusSchema, commentSchema, assignSchema, predictSchema } from "../validators/complaint.js";
import * as C from "../controllers/complaintController.js";

const uploadDir = path.join(process.cwd(), "src", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /image\/(png|jpeg|jpg|gif|webp)/.test(file.mimetype);
    cb(ok ? null : new Error("Only images allowed"), ok);
  },
});

const router = express.Router();
router.use(requireAuth);
router.get("/", asyncHandler(C.listComplaints));
router.post("/predict", validate(predictSchema), asyncHandler(C.predictComplaint));
router.post("/", upload.array("attachments", 5), createComplaintSchema ? validate(createComplaintSchema) : (r,s,n)=>n(), asyncHandler(C.createComplaint));
router.get("/:id", asyncHandler(C.getComplaint));
router.patch("/:id", validate(updateComplaintSchema), asyncHandler(C.updateComplaint));
router.patch("/:id/status", validate(statusSchema), asyncHandler(C.changeStatus));
router.post("/:id/comments", validate(commentSchema), asyncHandler(C.addComment));
router.post("/:id/assign", requireRole("admin"), validate(assignSchema), asyncHandler(C.assignComplaint));
router.get("/:id/history", asyncHandler(C.getHistory));
export default router;
