import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type JwtPayload = {
  sub: string;
  role: "user" | "admin" | "warehouse_staff" | "knitter";
};

export const signAccessToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as any });

export const signRefreshToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.refreshSecret, { expiresIn: env.refreshExpiresIn as any });

export const verifyAccessToken = (token: string) => jwt.verify(token, env.jwtSecret) as JwtPayload;
export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, env.refreshSecret) as JwtPayload;
