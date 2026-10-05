import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Product } from "@/models/Product";
import { validateFlipkartListing } from "@/lib/flipkart/validator";

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
      product.flipkart.listingStatus = validation.isValid ? "READY" : "FAILED";
    }

    await product.save();

    return NextResponse.json({
      success: true,
      sku: product.sku,
      validation,
      flipkartStatus: product.flipkart.listingStatus,
    });
  } catch (error: any) {
    console.error("Listing validation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to validate listing" },
      { status: 500 }
    );
  }
}
