import { ChatbotLog } from "../models/ChatbotLog";

export const logMessage = (payload: { user?: string; message: string; response: string; intent?: string }) =>
  ChatbotLog.create(payload);

export const recommendProducts = () => [
  { id: "sample1", name: "Velocity Pro Running Shoes" },
  { id: "sample2", name: "Air Striker Football Boots" },
];

export const productInfo = (id: string) => ({ id, name: "Sample product", details: "Details placeholder" });
