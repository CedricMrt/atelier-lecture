import type { Request, Response, NextFunction } from "express";

export const DEVICE_SYNC_TOKEN =
  process.env.DEVICE_SYNC_TOKEN ?? "prototype-device-token";

export function requireDeviceToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;

  if (header !== `Bearer ${DEVICE_SYNC_TOKEN}`) {
    res.status(401).json({ error: "Synchronisation non autorisée" });
    return;
  }

  next();
}
