import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { FlipkartLog } from "@/models/FlipkartLog";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const operation = searchParams.get("operation");
    const result = searchParams.get("result");
    const search = searchParams.get("search");

    await connectToDatabase();

    const query: Record<string, any> = {};
    if (operation && operation !== "ALL") {
      query.operation = operation;
    }
    if (result && result !== "ALL") {
      query.result = result;
    }
    if (search) {
      query.$or = [
        { sku: { $regex: search, $options: "i" } },
        { productName: { $regex: search, $options: "i" } },
        { flipkartListingId: { $regex: search, $options: "i" } },
      ];
    }

    const total = await FlipkartLog.countDocuments(query);
    const logs = await FlipkartLog.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Flipkart logs route error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load logs" },
      { status: 500 }
    );
  }
}
