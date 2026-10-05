import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Product } from "@/models/Product";
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

    const result = await publishProductToFlipkart(product);

    return NextResponse.json({
      success: true,
      result,
      product: {
        id: product._id,
        sku: product.sku,
        listingStatus: product.flipkart.listingStatus,
        listingId: product.flipkart.listingId,
      },
    });
  } catch (error: any) {
    console.error("Publish listing error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.userMessage || error.message || "Failed to publish listing",
        fieldErrors: error.fieldErrors,
      },
      { status: error.statusCode || 500 }
    );
  }
}
