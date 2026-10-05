import { NextResponse } from "next/server";
import { disconnectFlipkart } from "@/lib/flipkart/auth";

export async function POST() {
  try {
    await disconnectFlipkart();
    return NextResponse.json({
      success: true,
      message: "Flipkart account disconnected successfully. Tokens cleared.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to disconnect" },
      { status: 500 }
    );
  }
}
