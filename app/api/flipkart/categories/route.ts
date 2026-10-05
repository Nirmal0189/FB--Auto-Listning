import { NextResponse } from "next/server";
import { getFlipkartCategories } from "@/lib/flipkart/categories";
import { COMMON_FLIPKART_ATTRIBUTES } from "@/lib/flipkart/attributes";

export async function GET() {
  try {
    const categories = await getFlipkartCategories();
    return NextResponse.json({
      success: true,
      categories,
      commonAttributes: COMMON_FLIPKART_ATTRIBUTES,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load categories" },
      { status: 500 }
    );
  }
}
