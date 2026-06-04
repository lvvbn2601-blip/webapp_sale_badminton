import { User, IUser } from "../models/User";
import { ApiError } from "../utils/apiError";
import { signAccessToken, signRefreshToken } from "../utils/jwt";
import { env } from "../config/env";
import bcrypt from "bcryptjs";
import { redis } from "../config/redis";

export const register = async (payload: { name: string; email: string; password: string }) => {
  const existing = await User.findOne({ email: payload.email });
  if (existing) throw new ApiError(400, "Email already registered");
  const user = await User.create(payload);
  const tokens = issueTokens(user);
  return { user, ...tokens };
};

export const login = async (email: string, password: string) => {
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(401, "Invalid credentials");
  const match = await user.comparePassword(password);
  if (!match) throw new ApiError(401, "Invalid credentials");

  // Block locked accounts from logging in
  if (user.status === "locked") {
    throw new ApiError(403, "Your account has been locked. Please contact support for assistance.");
  }

  const tokens = issueTokens(user);
  return { user, ...tokens };
};

export const logout = async (userId: string) => {
  await redis.del(refreshKey(userId));
};

export const refresh = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(401, "Invalid user");

  // Block locked accounts from refreshing tokens
  if (user.status === "locked") {
    await redis.del(refreshKey(userId));
    throw new ApiError(403, "Your account has been locked. Please contact support for assistance.");
  }

  const tokens = issueTokens(user);
  return { user, ...tokens };
};

export const updateProfile = async (userId: string, data: Partial<IUser>) => {
  const user = await User.findByIdAndUpdate(userId, data, { new: true });
  if (!user) throw new ApiError(404, "User not found");
  return user;
};

export const changePassword = async (userId: string, current: string, next: string) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");
  const match = await user.comparePassword(current);
  if (!match) throw new ApiError(400, "Current password incorrect");
  user.password = next;
  await user.save();
  return true;
};

const refreshKey = (userId: string) => `refresh:${userId}`;

const issueTokens = (user: IUser) => {
  const payload = { sub: (user as any).id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  redis.set(refreshKey((user as any).id), refreshToken, "EX", 60 * 60 * 24 * 30);
  return { accessToken, refreshToken, expiresIn: env.jwtExpiresIn };
};

const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10)
}
