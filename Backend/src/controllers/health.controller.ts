import { Request, Response } from "express";

export const healthCheck = (_req: Request, res: Response) => {
  return res.json({
    ok: true,
    message: "AgentOS backend is running ✅",
    timestamp: new Date().toISOString(),
  });
};
