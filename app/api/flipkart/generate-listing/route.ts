import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Product } from "@/models/Product";
import { generateFlipkartListingWithAi } from "@/lib/flipkart/ai";
import { validateFlipkartListing } from "@/lib/flipkart/validator";
import { FlipkartIntegration } from "@/models/FlipkartIntegration";
import { publishProductToFlipkart } from "@/lib/flipkart/listings";

export async function POST(request: Request) {
  try {
    const { productId, sku } = await request.json();

    if (!productId && !sku) {
      return NextResponse.json(
        { success: false, error: "Either productId or sku must be provided" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const product = productId
      ? await Product.findById(productId)
      : await Product.findOne({ sku });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Generate listing using AI
    const result = await generateFlipkartListingWithAi(product);

    product.flipkart.aiListing = result.listing;
    product.flipkart.categoryId = result.listing.suggestedCategory.id;
    product.flipkart.categoryName = result.listing.suggestedCategory.name;

    // Run listing validator
    const validation = await validateFlipkartListing(product);
    product.flipkart.validation = {
      isValid: validation.isValid,
      score: validation.score,
      validFields: validation.validFields,
      warnings: validation.warnings,
      criticalErrors: validation.criticalErrors,
      validatedAt: new Date(),
    };

    if (product.flipkart.listingStatus !== "LIVE" && product.flipkart.listingStatus !== "PENDING") {
      product.flipkart.listingStatus = validation.isValid ? "READY" : "DRAFT";
    }

    await product.save();

    // Check if Automatic Publishing is enabled
    const integration = await FlipkartIntegration.findOne();
    let autoPublishedResult = null;

    if (
      integration?.autoListing &&
      integration.publishingMode === "AUTOMATIC" &&
      validation.isValid &&
      product.flipkart.listingStatus !== "LIVE"
    ) {
      try {
        autoPublishedResult = await publishProductToFlipkart(product);
      } catch (pubErr: any) {
        console.warn("[Auto-Publish] Failed:", pubErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      product: {
        id: product._id,
        name: product.name,
        sku: product.sku,
        flipkart: product.flipkart,
      },
      aiListing: result.listing,
      missingFields: result.missingFields,
      validation,
      autoPublished: !!autoPublishedResult,
      autoPublishedResult,
    });
  } catch (error: any) {
    console.error("AI Listing generation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate AI listing" },
      { status: 500 }
    );
  }
}
