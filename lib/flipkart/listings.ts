import { flipkartClient } from "./client";
import { IProduct } from "../../models/Product";
import { validateFlipkartListing } from "./validator";
import { FlipkartValidationError } from "./errors";
import { connectToDatabase } from "../db/mongodb";
import { Product } from "../../models/Product";
import { FlipkartIntegration } from "../../models/FlipkartIntegration";

export interface PublishListingResult {
  success: boolean;
  listingId: string;
  sku: string;
  status: "LIVE" | "PENDING" | "FAILED";
  isDryRun: boolean;
  message: string;
  apiResponse: unknown;
}

/**
 * Builds the official Flipkart Listings v3 payload
 */
export function buildFlipkartListingPayload(product: IProduct) {
  const title = product.flipkart?.aiListing?.title || product.name;
  const hsn = product.hsnCode || "3923";
  const gst = product.gstRate || 18;

  return {
    product_id: product.sku,
    category_id: product.flipkart?.categoryId || "CAT_CONTAINER_JAR",
    vertical: product.flipkart?.vertical || "container_jar",
    attribute_values: {
      title,
      brand: product.brand || "FP AUTO",
      model_name: product.name,
      mrp: {
        value: product.mrp,
        currency: "INR",
      },
      selling_price: {
        value: product.price,
        currency: "INR",
      },
      listing_status: product.stock > 0 ? "ACTIVE" : "INACTIVE",
      procurement_sla: 1,
      procurement_type: "REGULAR",
      package_length: {
        value: product.packageDimensions?.length || 20,
        unit: (product.packageDimensions?.unit || "cm").toUpperCase(),
      },
      package_breadth: {
        value: product.packageDimensions?.width || 15,
        unit: (product.packageDimensions?.unit || "cm").toUpperCase(),
      },
      package_height: {
        value: product.packageDimensions?.height || 10,
        unit: (product.packageDimensions?.unit || "cm").toUpperCase(),
      },
      package_weight: {
        value: product.packageWeight?.value || 0.5,
        unit: (product.packageWeight?.unit || "kg").toUpperCase(),
      },
      hsn,
      tax_code: `GST_${gst}`,
      country_of_origin: product.countryOfOrigin || "India",
      manufacturer_details: product.manufacturerDetails || "FP AUTO Pvt. Ltd.",
      main_image_url: product.images?.[0] || "",
      other_image_urls: product.images?.slice(1) || [],
      highlights: product.flipkart?.aiListing?.highlights || product.features || [],
      description: product.flipkart?.aiListing?.description || product.description,
      search_keywords: product.flipkart?.aiListing?.searchKeywords || [],
      specifications: product.flipkart?.aiListing?.specifications || {},
    },
  };
}

/**
 * Publishes a product to Flipkart (or simulates in Dry Run mode)
 */
export async function publishProductToFlipkart(product: IProduct): Promise<PublishListingResult> {
  await connectToDatabase();

  // 1. Mandatory Pre-Publishing Validation
  const validation = await validateFlipkartListing(product);
  product.flipkart.validation = {
    isValid: validation.isValid,
    score: validation.score,
    validFields: validation.validFields,
    warnings: validation.warnings,
    criticalErrors: validation.criticalErrors,
    validatedAt: new Date(),
  };

  if (!validation.isValid) {
    product.flipkart.listingStatus = "FAILED";
    product.flipkart.lastError = `Validation failed: ${validation.criticalErrors[0]}`;
    await product.save();

    throw new FlipkartValidationError(validation.criticalErrors, {
      score: validation.score,
      validFields: validation.validFields,
    });
  }

  const isDry = await flipkartClient.isDryRun();
  const payload = buildFlipkartListingPayload(product);

  if (isDry) {
    // DRY RUN MODE SIMULATION
    const simulatedListingId = `FK_SIM_${product.sku}_${Math.floor(1000 + Math.random() * 9000)}`;
    const simulatedResponse = {
      status: "SUCCESS",
      mode: "DRY_RUN_SIMULATION",
      flipkart_listing_id: simulatedListingId,
      sku: product.sku,
      qc_status: "PASSED",
      listing_status: "LIVE",
      message: "Dry run simulated successfully. Official Flipkart payload was validated and verified without making live changes.",
      timestamp: new Date().toISOString(),
      payload_preview: payload,
    };

    product.flipkart.listingId = simulatedListingId;
    product.flipkart.listingStatus = "LIVE";
    product.flipkart.lastPublishedAt = new Date();
    product.flipkart.lastSyncedAt = new Date();
    product.flipkart.lastError = undefined;
    product.flipkart.lastApiResponse = simulatedResponse;
    await product.save();

    // Increment integration stats
    await updateStatsOnPublish(true);

    // Record activity log for dry-run simulation
    try {
      const { FlipkartLog } = await import("../../models/FlipkartLog");
      await FlipkartLog.create({
        timestamp: new Date(),
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        operation: "CREATE_LISTING",
        apiStatus: "200 (SIMULATED)",
        result: "SUCCESS",
        durationMs: 45,
        flipkartListingId: simulatedListingId,
        isDryRun: true,
        user: "Admin (Dry Run)",
        details: { payloadPreview: payload },
      });
    } catch (e) {
      console.error("Failed to write dry-run log:", e);
    }

    return {
      success: true,
      listingId: simulatedListingId,
      sku: product.sku,
      status: "LIVE",
      isDryRun: true,
      message: "Dry run: Product listing successfully validated and simulated.",
      apiResponse: simulatedResponse,
    };
  }

  // OFFICIAL PRODUCTION API CALL
  try {
    product.flipkart.listingStatus = "PUBLISHING";
    await product.save();

    const response = await flipkartClient.request<{
      status?: string;
      listing_id?: string;
      fsn?: string;
      errors?: string[];
    }>({
      method: "POST",
      endpoint: "/listings/v3/update",
      data: payload,
      operationName: "CREATE_LISTING",
      sku: product.sku,
      productId: String(product._id),
      productName: product.name,
      timeoutMs: 15000,
    });

    const listingId = response.data?.listing_id || `FK_${product.sku}`;
    const fsn = response.data?.fsn;

    product.flipkart.listingId = listingId;
    if (fsn) product.flipkart.fsn = fsn;
    product.flipkart.listingStatus = "PENDING"; // Flipkart QC review period
    product.flipkart.lastPublishedAt = new Date();
    product.flipkart.lastSyncedAt = new Date();
    product.flipkart.lastError = undefined;
    product.flipkart.lastApiResponse = response.data;
    await product.save();

    await updateStatsOnPublish(false);

    return {
      success: true,
      listingId,
      sku: product.sku,
      status: "PENDING",
      isDryRun: false,
      message: "Listing submitted to Flipkart Marketplace. Listing is currently under Quality Check (QC).",
      apiResponse: response.data,
    };
  } catch (error: any) {
    product.flipkart.listingStatus = "FAILED";
    product.flipkart.lastError = error.userMessage || error.message || "Failed to publish listing to Flipkart";
    product.flipkart.lastApiResponse = error.details || null;
    await product.save();
    throw error;
  }
}

/**
 * Updates stats counter on publish
 */
async function updateStatsOnPublish(isDryRun: boolean) {
  try {
    const integration = await FlipkartIntegration.findOne();
    if (integration) {
      integration.stats.publishedToday = (integration.stats.publishedToday || 0) + 1;
      if (isDryRun) {
        integration.stats.liveListings = (integration.stats.liveListings || 0) + 1;
      } else {
        integration.stats.pendingListings = (integration.stats.pendingListings || 0) + 1;
      }
      await integration.save();
    }
  } catch (e) {
    console.error("Failed to update stats on publish:", e);
  }
}
