import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as A from "../controllers/aiController.js";
const router = express.Router();
router.use(requireAuth);
router.post("/categorize", asyncHandler(A.categorize));
router.post("/predict-priority", asyncHandler(A.predictPrio));
export default router;
