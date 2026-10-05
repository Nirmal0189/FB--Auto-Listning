import { flipkartClient } from "./client";
import { connectToDatabase } from "../db/mongodb";
import { Product } from "../../models/Product";
import { FlipkartIntegration } from "../../models/FlipkartIntegration";

export interface PriceUpdateResult {
  sku: string;
  price: number;
  mrp: number;
  success: boolean;
  isDryRun: boolean;
  message: string;
}

/**
 * Updates price and MRP on Flipkart for a product SKU
 */
export async function updateFlipkartPrice(sku: string, price: number, mrp: number): Promise<PriceUpdateResult> {
  await connectToDatabase();
  const product = await Product.findOne({ sku });

  if (!product) {
    throw new Error(`Product with SKU ${sku} not found`);
  }

  if (price > mrp) {
    throw new Error(`Selling price (₹${price}) cannot exceed MRP (₹${mrp})`);
  }

  const isDry = await flipkartClient.isDryRun();

  if (isDry) {
    product.flipkart.lastSyncedAt = new Date();
    await product.save();

    await incrementStat("priceUpdatesToday");

    return {
      sku,
      price,
      mrp,
      success: true,
      isDryRun: true,
      message: `[Dry Run] Price updated to ₹${price} (MRP: ₹${mrp}) for ${sku}.`,
    };
  }

  const payload = {
    product_id: sku,
    mrp,
    selling_price: price,
    currency: "INR",
  };

  await flipkartClient.request({
    method: "POST",
    endpoint: "/listings/v3/update/price",
    data: payload,
    operationName: "UPDATE_PRICE",
    sku,
    productName: product.name,
    productId: String(product._id),
  });

  product.flipkart.lastSyncedAt = new Date();
  await product.save();

  await incrementStat("priceUpdatesToday");

  return {
    sku,
    price,
    mrp,
    success: true,
    isDryRun: false,
    message: `Price successfully updated on Flipkart: ₹${price} (MRP ₹${mrp}).`,
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
