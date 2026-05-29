import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { Review } from "../models/Review";
import { Product } from "../models/Product";
import { syncProductRating } from "../services/reviewService";

const runMigration = async () => {
  try {
    // 1. Connect to MongoDB database
    await connectDB();
    console.log("Database connected successfully. Starting reviews migration...");

    // 2. Query all existing pending or rejected reviews
    const reviewsToUpdate = await Review.find({ status: { $in: ["pending", "rejected"] } });
    console.log(`Found ${reviewsToUpdate.length} reviews with status 'pending' or 'rejected'.`);

    if (reviewsToUpdate.length > 0) {
      // 3. Update all of them to approved
      const result = await Review.updateMany(
        { status: { $in: ["pending", "rejected"] } },
        { status: "approved" }
      );
      console.log(`Successfully updated ${result.modifiedCount} reviews to status 'approved'.`);

      // 4. Gather unique product IDs that need their ratings synchronized
      const uniqueProductIds = [...new Set(reviewsToUpdate.map((r) => r.product.toString()))];
      console.log(`Synchronizing rating and review stats for ${uniqueProductIds.length} unique products...`);

      for (const pid of uniqueProductIds) {
        await syncProductRating(pid);
        console.log(`  - Synchronized product ID: ${pid}`);
      }
      console.log("All product ratings synchronized successfully!");
    } else {
      console.log("No pending or rejected reviews to migrate.");
    }

    console.log("Reviews migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed with error:", err);
    process.exit(1);
  }
};

runMigration();
