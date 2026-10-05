import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Product } from "@/models/Product";
import { FlipkartIntegration } from "@/models/FlipkartIntegration";
import { updateFlipkartInventory } from "@/lib/flipkart/inventory";
import { updateFlipkartPrice } from "@/lib/flipkart/pricing";
import { publishProductToFlipkart } from "@/lib/flipkart/listings";

export async function POST() {
  try {
    await connectToDatabase();
    const integration = await FlipkartIntegration.findOne();

    if (!integration) {
      return NextResponse.json({ success: false, error: "Flipkart integration not configured" }, { status: 400 });
    }

    const liveProducts = await Product.find({ "flipkart.listingStatus": "LIVE" });
    const failedProducts = await Product.find({ "flipkart.listingStatus": "FAILED" });

    let syncedInventoryCount = 0;
    let syncedPriceCount = 0;
    let retriedSuccessCount = 0;

    // 1. Sync Inventory if enabled
    if (integration.autoInventorySync) {
      for (const p of liveProducts) {
        try {
          await updateFlipkartInventory(p.sku, p.stock);
          syncedInventoryCount++;
        } catch (e) {
          console.warn(`[Sync] Failed to sync inventory for ${p.sku}:`, e);
        }
      }
    }

    // 2. Sync Price if enabled
    if (integration.autoPriceSync) {
      for (const p of liveProducts) {
        try {
          await updateFlipkartPrice(p.sku, p.price, p.mrp);
          syncedPriceCount++;
        } catch (e) {
          console.warn(`[Sync] Failed to sync price for ${p.sku}:`, e);
        }
      }
    }

    // 3. Retry Failed listings if enabled
    if (integration.retryFailedListings) {
      for (const p of failedProducts) {
        try {
          // If error was not missing required specs, try publishing again
          const res = await publishProductToFlipkart(p);
          if (res.status === "LIVE" || res.status === "PENDING") {
            retriedSuccessCount++;
          }
        } catch {
          // Keep as failed
        }
      }
    }

    integration.lastSyncAt = new Date();
    await integration.save();

    return NextResponse.json({
      success: true,
      message: "Flipkart synchronization pass completed successfully.",
      syncedInventoryCount,
      syncedPriceCount,
      retriedSuccessCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Flipkart sync route error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed during synchronization" },
      { status: 500 }
    );
  }
}
