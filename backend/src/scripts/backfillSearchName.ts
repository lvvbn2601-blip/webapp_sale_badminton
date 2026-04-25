/**
 * One-time migration script to backfill the `searchName` field
 * on all existing products.
 *
 * Usage:  npx ts-node src/scripts/backfillSearchName.ts
 *
 * This reads every product, computes its normalised search key,
 * and writes it back to MongoDB.  Safe to re-run.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { Product } from "../models/Product";
import { toSearchKey } from "../utils/vietnameseSearch";
import { env } from "../config/env";

async function main() {
  const uri = env.mongoUri;
  console.log(`Connecting to MongoDB: ${uri.replace(/\/\/.*@/, "//***@")}`);
  await mongoose.connect(uri);

  const products = await Product.find({});
  console.log(`Found ${products.length} products to backfill.`);

  let updated = 0;
  for (const p of products) {
    const newSearchName = toSearchKey(p.name);
    if (p.searchName !== newSearchName) {
      p.searchName = newSearchName;
      await p.save();
      updated++;
      console.log(`  ✔ ${p.name} → ${newSearchName}`);
    }
  }

  console.log(`\nDone! Updated ${updated} / ${products.length} products.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
