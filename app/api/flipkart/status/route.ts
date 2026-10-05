import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { FlipkartIntegration } from "@/models/FlipkartIntegration";
import { Product } from "@/models/Product";

export async function GET() {
  try {
    await connectToDatabase();
    let integration = await FlipkartIntegration.findOne();

    if (!integration) {
      integration = await FlipkartIntegration.create({
        isConnected: false,
        apiStatus: "DISCONNECTED",
        environment: process.env.FLIPKART_ENVIRONMENT || "sandbox",
        isDryRun: true,
        publishingMode: "MANUAL_APPROVAL",
        autoListing: false,
      });
    }

    // Refresh dynamic product counts from database
    const totalProducts = await Product.countDocuments();
    const liveCount = await Product.countDocuments({ "flipkart.listingStatus": "LIVE" });
    const pendingCount = await Product.countDocuments({
      "flipkart.listingStatus": { $in: ["PENDING", "PUBLISHING", "VALIDATING"] },
    });
    const failedCount = await Product.countDocuments({ "flipkart.listingStatus": "FAILED" });
    const notListedCount = await Product.countDocuments({
      "flipkart.listingStatus": { $in: ["NOT_LISTED", "DRAFT", "READY"] },
    });

    integration.stats.totalListings = totalProducts;
    integration.stats.liveListings = liveCount;
    integration.stats.pendingListings = pendingCount;
    integration.stats.failedListings = failedCount;

    return NextResponse.json({
      success: true,
      integration: {
        isConnected: integration.isConnected,
        sellerId: integration.sellerId || "-",
        sellerName: integration.sellerName || "FP AUTO Pvt. Ltd.",
        email: integration.email || "-",
        apiStatus: integration.apiStatus,
        lastSyncAt: integration.lastSyncAt,
        lastHealthCheckAt: integration.lastHealthCheckAt,
        environment: integration.environment,
        isDryRun: integration.isDryRun,
        autoListing: integration.autoListing,
        publishingMode: integration.publishingMode,
        autoInventorySync: integration.autoInventorySync,
        autoPriceSync: integration.autoPriceSync,
        aiListingGeneration: integration.aiListingGeneration,
        retryFailedListings: integration.retryFailedListings,
        stats: {
          totalProducts,
          liveCount,
          pendingCount,
          failedCount,
          notListedCount,
          publishedToday: integration.stats?.publishedToday || 0,
          inventorySyncedToday: integration.stats?.inventorySyncedToday || 0,
          priceUpdatesToday: integration.stats?.priceUpdatesToday || 0,
          failedApiRequestsToday: integration.stats?.failedApiRequestsToday || 0,
        },
      },
    });
  } catch (error: any) {
    console.error("Flipkart status route error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve status" },
      { status: 500 }
    );
  }
}
