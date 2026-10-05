import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { FlipkartIntegration } from "@/models/FlipkartIntegration";

export async function GET() {
  try {
    await connectToDatabase();
    const integration = await FlipkartIntegration.findOne();
    return NextResponse.json({
      success: true,
      settings: {
        isDryRun: integration ? integration.isDryRun : true,
        autoListing: integration ? integration.autoListing : false,
        publishingMode: integration ? integration.publishingMode : "MANUAL_APPROVAL",
        autoInventorySync: integration ? integration.autoInventorySync : true,
        autoPriceSync: integration ? integration.autoPriceSync : true,
        aiListingGeneration: integration ? integration.aiListingGeneration : true,
        retryFailedListings: integration ? integration.retryFailedListings : true,
        environment: integration ? integration.environment : "sandbox",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    await connectToDatabase();

    let integration = await FlipkartIntegration.findOne();
    if (!integration) {
      integration = new FlipkartIntegration();
    }

    if (typeof body.isDryRun === "boolean") integration.isDryRun = body.isDryRun;
    if (typeof body.autoListing === "boolean") integration.autoListing = body.autoListing;
    if (body.publishingMode) integration.publishingMode = body.publishingMode;
    if (typeof body.autoInventorySync === "boolean") integration.autoInventorySync = body.autoInventorySync;
    if (typeof body.autoPriceSync === "boolean") integration.autoPriceSync = body.autoPriceSync;
    if (typeof body.aiListingGeneration === "boolean") integration.aiListingGeneration = body.aiListingGeneration;
    if (typeof body.retryFailedListings === "boolean") integration.retryFailedListings = body.retryFailedListings;
    if (body.environment) integration.environment = body.environment;

    await integration.save();

    return NextResponse.json({
      success: true,
      message: "Flipkart integration settings updated successfully",
      settings: {
        isDryRun: integration.isDryRun,
        autoListing: integration.autoListing,
        publishingMode: integration.publishingMode,
        autoInventorySync: integration.autoInventorySync,
        autoPriceSync: integration.autoPriceSync,
        aiListingGeneration: integration.aiListingGeneration,
        retryFailedListings: integration.retryFailedListings,
        environment: integration.environment,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
