import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as AuthService from "../services/authService";
import { User } from "../models/User";
import { verifyRefreshToken } from "../utils/jwt";
import { ApiError } from "../utils/apiError";
import { AuthRequest } from "../middlewares/auth";
import { ok } from "../utils/apiResponse";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body ?? {};

  if (!name || !email || !password) {
    // Returning a 400 avoids crashing when the client forgets the JSON body or content-type
    throw new ApiError(400, "Name, email, and password are required");
  }

  const result = await AuthService.register({ name, email, password });
  res.status(201).json(ok(result, "Registered"));
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const result = await AuthService.login(email, password);
  res.json(ok(result, "Logged in"));
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  await AuthService.logout(req.user.sub);
  res.json(ok(true, "Logged out"));
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) throw new ApiError(401, "Missing token");
  const payload = verifyRefreshToken(refreshToken);
  const result = await AuthService.refresh(payload.sub);
  res.json(ok(result, "Token refreshed"));
});

export const profile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const user = await User.findById(req.user.sub).select("-password");
  res.json(ok(user));
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const user = await AuthService.updateProfile(req.user.sub, req.body);
  res.json(ok(user));
});

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) throw new ApiError(400, "Current and new password are required");
  await AuthService.changePassword(req.user.sub, currentPassword, newPassword);
  res.json(ok(true, "Password updated"));
});
