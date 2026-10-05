import { NextResponse } from "next/server";
import { updateFlipkartPrice } from "@/lib/flipkart/pricing";

export async function POST(request: Request) {
  try {
    const { sku, price, mrp } = await request.json();

    if (!sku || typeof price !== "number" || typeof mrp !== "number") {
      return NextResponse.json(
        { success: false, error: "sku, price, and mrp are required" },
        { status: 400 }
      );
    }

    const result = await updateFlipkartPrice(sku, price, mrp);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.userMessage || error.message || "Failed to update price" },
      { status: 500 }
    );
  }
}
