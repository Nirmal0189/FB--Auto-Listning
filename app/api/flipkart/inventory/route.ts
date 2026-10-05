import { NextResponse } from "next/server";
import { updateFlipkartInventory } from "@/lib/flipkart/inventory";

export async function POST(request: Request) {
  try {
    const { sku, stock } = await request.json();

    if (!sku || typeof stock !== "number") {
      return NextResponse.json(
        { success: false, error: "sku and numeric stock are required" },
        { status: 400 }
      );
    }

    const result = await updateFlipkartInventory(sku, stock);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.userMessage || error.message || "Failed to update inventory" },
      { status: 500 }
    );
  }
}
