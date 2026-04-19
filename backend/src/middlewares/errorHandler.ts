import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, error: err.message, details: err.details });
  }
  console.error(err);
  return res.status(500).json({ success: false, error: "Internal server error" });
};
