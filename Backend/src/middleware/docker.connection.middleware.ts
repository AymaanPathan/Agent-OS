import { Request, Response, NextFunction } from "express";
import { dockerConnectionService } from "../service/docker.connection.service";

/**
 * Middleware to ensure Docker is connected before allowing access to Docker-dependent routes
 */
export async function requireDockerConnection(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const isConnected = await dockerConnectionService.isConnected();

    if (!isConnected) {
      const status = await dockerConnectionService.getConnectionStatus();

      return res.status(503).json({
        success: false,
        error: "Docker connection required",
        message:
          "Please connect to Docker before using this feature. This is an SRE system that requires Docker access.",
        dockerStatus: status,
        hint: status.error || "Please ensure Docker is running and accessible",
      });
    }

    next();
  } catch (error: any) {
    console.error("❌ Docker connection check failed:", error);
    return res.status(503).json({
      success: false,
      error: "Docker connection check failed",
      message: error.message,
    });
  }
}

/**
 * Optional middleware - warns but doesn't block if Docker is not connected
 */
export async function checkDockerConnection(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const isConnected = await dockerConnectionService.isConnected();

    if (!isConnected) {
      console.warn(
        "⚠️ [Docker Middleware] Warning: Docker is not connected for route:",
        req.path,
      );
    }

    next();
  } catch (error: any) {
    console.error("❌ Docker connection check error:", error);
    next();
  }
}
