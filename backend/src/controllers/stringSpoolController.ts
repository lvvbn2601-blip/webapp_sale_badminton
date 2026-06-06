import { Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { AuthRequest } from "../middlewares/auth";
import { ok } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { StringSpool } from "../models/StringSpool";

// List all spools
export const listSpools = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const spools = await StringSpool.find().populate("addedBy", "name email").sort({ createdAt: -1 });
  res.json(ok(spools));
});

// Create a new spool
export const createSpool = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.sub;
  const { name, brand, color, currentMeters, totalMeters, alertThreshold, price, power, sound, control, desc } = req.body;

  if (!name || !brand || !color || totalMeters === undefined || price === undefined) {
    throw new ApiError(400, "Missing required fields");
  }

  const spool = await StringSpool.create({
    name,
    brand,
    color,
    currentMeters: currentMeters ?? totalMeters,
    totalMeters,
    alertThreshold: alertThreshold ?? 50,
    price,
    power,
    sound,
    control,
    desc,
    addedBy: userId,
  });

  const populatedSpool = await StringSpool.findById(spool._id).populate("addedBy", "name email");
  res.status(201).json(ok(populatedSpool));
});

// Update spool meters (adjust)
export const updateSpoolMeters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { amount } = req.body; // positive to add, negative to subtract

  if (amount === undefined || typeof amount !== "number") {
    throw new ApiError(400, "Invalid amount");
  }

  const spool = await StringSpool.findById(id);
  if (!spool) {
    throw new ApiError(404, "Spool not found");
  }

  const newMeters = Math.max(0, Math.min(spool.totalMeters, spool.currentMeters + amount));
  spool.currentMeters = newMeters;
  await spool.save();

  res.json(ok(spool));
});

// Delete spool
export const deleteSpool = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const spool = await StringSpool.findByIdAndDelete(id);
  if (!spool) {
    throw new ApiError(404, "Spool not found");
  }
  res.json(ok({ message: "Spool deleted" }));
});
