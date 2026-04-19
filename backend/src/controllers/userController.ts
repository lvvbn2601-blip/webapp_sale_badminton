import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as UserService from "../services/userService";
import { ok } from "../utils/apiResponse";

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await UserService.listUsers().select("-password");
  res.json(ok(users));
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await UserService.createUser(req.body);
  res.json(ok(user));
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await UserService.getUser(req.params.id as string);
  res.json(ok(user));
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  await UserService.deleteUser(req.params.id as string);
  res.json(ok(true, "User deleted"));
});

export const updateAdminUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await UserService.updateAdminUser(req.params.id as string, req.body);
  res.json(ok(user));
});

export const giveVoucher = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await UserService.giveVoucher(req.params.id as string);
  res.json(ok(coupon, "Voucher sent to user successfully"));
});

export const addPoints = asyncHandler(async (req: Request, res: Response) => {
  const user = await UserService.addPoints(req.params.id as string, Number(req.body.points));
  res.json(ok(user, "Points added successfully"));
});

export const getProfile = asyncHandler(async (req: any, res: Response) => {
  const user = await UserService.getUser(req.user.sub);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(ok({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatar: user.avatar,
    gender: user.gender,
    address: user.address,
    addressList: user.addressList,
    dob: user.dob,
    points: user.points,
    membershipTier: user.membershipTier,
    totalSpending: user.totalSpending,
  }));
});

export const updateProfile = asyncHandler(async (req: any, res: Response) => {
  const user = await UserService.updateProfile(req.user.sub, req.body);
  res.json(ok(user));
});
