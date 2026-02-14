import { Router } from "express";
import {
  approveRun,
  getRunById,
  rejectRun,
  startRun,
} from "../controllers/run.controller";
import { requireDockerConnection } from "../middleware/docker.connection.middleware";

const router = Router();

// Apply Docker connection requirement to all run routes
router.use(requireDockerConnection);

router.post("/start", startRun);
router.get("/:runId", getRunById);
router.post("/:runId/approve", approveRun);
router.post("/:runId/reject", rejectRun);

export default router;
