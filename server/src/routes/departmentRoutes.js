import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as D from "../controllers/departmentController.js";
const router = express.Router();
router.use(requireAuth);
router.get("/", asyncHandler(D.listDepartments));
export default router;
