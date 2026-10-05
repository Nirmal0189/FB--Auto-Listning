import { NextResponse } from "next/server";
import { flipkartClient } from "@/lib/flipkart/client";
import { connectToDatabase } from "@/lib/db/mongodb";
import { FlipkartIntegration } from "@/models/FlipkartIntegration";

export async function POST() {
  try {
    const health = await flipkartClient.healthCheck();

    await connectToDatabase();
    const integration = await FlipkartIntegration.findOne();
    if (integration) {
      integration.lastHealthCheckAt = new Date();
      integration.apiStatus = health.isHealthy ? "HEALTHY" : "ERROR";
      integration.lastHealthCheckError = health.isHealthy ? undefined : health.message;
      await integration.save();
    }

    return NextResponse.json({
      success: health.isHealthy,
      health,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.userMessage || error.message || "Health check failed" },
      { status: 500 }
    );
  }
}
