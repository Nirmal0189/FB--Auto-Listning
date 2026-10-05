import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Product } from "@/models/Product";
import { publishProductToFlipkart } from "@/lib/flipkart/listings";

export interface BulkResultItem {
  id: string;
  sku: string;
  name: string;
  status: "PUBLISHED" | "PENDING" | "FAILED";
  listingId?: string;
  error?: string;
}

export async function POST(request: Request) {
  try {
    const { productIds } = await request.json();

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Please select at least one product" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const products = await Product.find({ _id: { $in: productIds } });

    const results: BulkResultItem[] = [];
    let publishedCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    for (const product of products) {
      try {
        const res = await publishProductToFlipkart(product);
        if (res.status === "LIVE") {
          publishedCount++;
          results.push({
            id: String(product._id),
            sku: product.sku,
            name: product.name,
            status: "PUBLISHED",
            listingId: res.listingId,
          });
        } else {
          pendingCount++;
          results.push({
            id: String(product._id),
            sku: product.sku,
            name: product.name,
            status: "PENDING",
            listingId: res.listingId,
          });
        }
      } catch (err: any) {
        failedCount++;
        results.push({
          id: String(product._id),
          sku: product.sku,
          name: product.name,
          status: "FAILED",
          error: err.userMessage || err.message || "Publishing failed",
        });
      }

      // Small delay between batch items to respect rate limits
      await new Promise((r) => setTimeout(r, 150));
    }

    return NextResponse.json({
      success: true,
      totalSelected: productIds.length,
      publishedCount,
      pendingCount,
      failedCount,
      results,
    });
  } catch (error: any) {
    console.error("Bulk publish error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute bulk publishing" },
      { status: 500 }
    );
  }
}
