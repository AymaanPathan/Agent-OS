import { Router } from "express";
import {
  approveRun,
  getRunById,
  rejectRun,
  startRun,
} from "../controllers/run.controller";

const router = Router();

router.post("/start", startRun);
router.get("/:runId", getRunById);
router.post("/:runId/approve", approveRun);
router.post("/:runId/approve", approveRun);
router.post("/:runId/reject", rejectRun);

export default router;
