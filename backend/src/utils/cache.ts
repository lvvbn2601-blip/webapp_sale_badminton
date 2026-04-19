import { redis } from "../config/redis";

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  const value = await redis.get(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const cacheSet = async (key: string, value: unknown, ttlSeconds = 300) => {
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
};

export const cacheDel = async (key: string) => {
  await redis.del(key);
};
