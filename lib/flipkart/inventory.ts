import { flipkartClient } from "./client";
import { connectToDatabase } from "../db/mongodb";
import { Product } from "../../models/Product";
import { FlipkartIntegration } from "../../models/FlipkartIntegration";

export interface InventoryUpdateResult {
  sku: string;
  stock: number;
  success: boolean;
  isDryRun: boolean;
  message: string;
}

/**
 * Updates stock inventory on Flipkart for a product SKU
 */
export async function updateFlipkartInventory(sku: string, stock: number): Promise<InventoryUpdateResult> {
  await connectToDatabase();
  const product = await Product.findOne({ sku });

  if (!product) {
    throw new Error(`Product with SKU ${sku} not found`);
  }

  const isDry = await flipkartClient.isDryRun();

  if (isDry) {
    product.flipkart.lastSyncedAt = new Date();
    await product.save();

    await incrementStat("inventorySyncedToday");

    try {
      const { FlipkartLog } = await import("../../models/FlipkartLog");
      await FlipkartLog.create({
        timestamp: new Date(),
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        operation: "UPDATE_INVENTORY",
        apiStatus: "200 (SIMULATED)",
        result: "SUCCESS",
        durationMs: 25,
        isDryRun: true,
        user: "Admin (Dry Run)",
        details: { updatedStock: stock },
      });
    } catch (e) {
      console.error("Failed to write dry-run inventory log:", e);
    }

    return {
      sku,
      stock,
      success: true,
      isDryRun: true,
      message: `[Dry Run] Stock updated to ${stock} units for ${sku}.`,
    };
  }

  const payload = {
    product_id: sku,
    locations: [
      {
        location_id: "LOC_DEFAULT",
        quantity: stock,
      },
    ],
  };

  await flipkartClient.request({
    method: "POST",
    endpoint: "/listings/v3/update/inventory",
    data: payload,
    operationName: "UPDATE_INVENTORY",
    sku,
    productName: product.name,
    productId: String(product._id),
  });

  product.flipkart.lastSyncedAt = new Date();
  await product.save();

  await incrementStat("inventorySyncedToday");

  return {
    sku,
    stock,
    success: true,
    isDryRun: false,
    message: `Stock successfully synchronized to Flipkart: ${stock} units.`,
  };
}

async function incrementStat(field: "inventorySyncedToday" | "priceUpdatesToday") {
  try {
    const integration = await FlipkartIntegration.findOne();
    if (integration) {
      integration.stats[field] = (integration.stats[field] || 0) + 1;
      await integration.save();
    }
  } catch (e) {
    console.error(`Failed to increment ${field}:`, e);
  }
}
