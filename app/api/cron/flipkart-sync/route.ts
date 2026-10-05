import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { FlipkartIntegration } from "@/models/FlipkartIntegration";
import { Product } from "@/models/Product";
import { updateFlipkartInventory } from "@/lib/flipkart/inventory";
import { updateFlipkartPrice } from "@/lib/flipkart/pricing";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Verify cron authorization if secret is configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const url = new URL(request.url);
      const key = url.searchParams.get("key");
      if (key !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
      }
    }

    await connectToDatabase();
    const integration = await FlipkartIntegration.findOne();

    if (!integration || !integration.isConnected) {
      return NextResponse.json({ message: "Flipkart is not connected; cron skipped" });
    }

    let inventoryCount = 0;
    let priceCount = 0;

    const liveProducts = await Product.find({ "flipkart.listingStatus": "LIVE" });

    if (integration.autoInventorySync) {
      for (const p of liveProducts) {
        try {
          await updateFlipkartInventory(p.sku, p.stock);
          inventoryCount++;
        } catch (e) {
          console.error(`Cron inventory sync failed for ${p.sku}:`, e);
        }
      }
    }

    if (integration.autoPriceSync) {
      for (const p of liveProducts) {
        try {
          await updateFlipkartPrice(p.sku, p.price, p.mrp);
          priceCount++;
        } catch (e) {
          console.error(`Cron price sync failed for ${p.sku}:`, e);
        }
      }
    }

    integration.lastSyncAt = new Date();
    await integration.save();

    return NextResponse.json({
      success: true,
      message: "Scheduled cron synchronization completed",
      inventoryCount,
      priceCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
