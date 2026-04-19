import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/apiResponse";
import { Setting } from "../models/Setting";

export const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  let settings = await Setting.findOne();
  if (!settings) {
    settings = await Setting.create({});
  }
  res.json(ok(settings));
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  let settings = await Setting.findOne();
  if (!settings) {
    settings = new Setting();
  }
  Object.assign(settings, req.body);
  await settings.save();
  res.json(ok(settings));
});
