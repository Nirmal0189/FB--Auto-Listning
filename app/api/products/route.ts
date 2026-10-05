import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Product } from "@/models/Product";
import { FlipkartIntegration } from "@/models/FlipkartIntegration";
import { generateFlipkartListingWithAi } from "@/lib/flipkart/ai";
import { validateFlipkartListing } from "@/lib/flipkart/validator";
import { publishProductToFlipkart } from "@/lib/flipkart/listings";

import { SAMPLE_PARTH_PRODUCTS } from "@/lib/sampleProducts";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const seed = searchParams.get("seed");

    await connectToDatabase();

    // Auto-seed if database is empty or seed=true was passed
    const count = await Product.countDocuments();
    if (count === 0 || seed === "true") {
      for (const item of SAMPLE_PARTH_PRODUCTS) {
        await Product.findOneAndUpdate({ sku: item.sku }, item, { upsert: true, new: true });
      }
    }

    const query: Record<string, any> = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }
    if (status && status !== "ALL") {
      query["flipkart.listingStatus"] = status;
    }

    const products = await Product.find(query).sort({ updatedAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error: any) {
    console.error("Products route error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load products" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    if (!data.name || !data.sku || !data.price || !data.mrp) {
      return NextResponse.json(
        { success: false, error: "name, sku, price, and mrp are required fields" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existing = await Product.findOne({ sku: data.sku.toUpperCase() });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Product with SKU "${data.sku}" already exists` },
        { status: 409 }
      );
    }

    const newProduct = new Product({
      ...data,
      sku: data.sku.toUpperCase(),
      flipkart: {
        enabled: true,
        listingStatus: "NOT_LISTED",
        sku: data.sku.toUpperCase(),
      },
    });

    await newProduct.save();

    // Check integration settings for automatic AI generation & publishing
    const integration = await FlipkartIntegration.findOne();
    let autoPublished = false;

    if (integration?.aiListingGeneration) {
      const aiResult = await generateFlipkartListingWithAi(newProduct);
      newProduct.flipkart.aiListing = aiResult.listing;
      newProduct.flipkart.categoryId = aiResult.listing.suggestedCategory.id;
      newProduct.flipkart.categoryName = aiResult.listing.suggestedCategory.name;

      const validation = await validateFlipkartListing(newProduct);
      newProduct.flipkart.validation = {
        isValid: validation.isValid,
        score: validation.score,
        validFields: validation.validFields,
        warnings: validation.warnings,
        criticalErrors: validation.criticalErrors,
        validatedAt: new Date(),
      };
      newProduct.flipkart.listingStatus = validation.isValid ? "READY" : "DRAFT";

      if (integration.autoListing && integration.publishingMode === "AUTOMATIC" && validation.isValid) {
        try {
          await publishProductToFlipkart(newProduct);
          autoPublished = true;
        } catch (pubErr) {
          console.warn("[Auto-Publish new product failed]:", pubErr);
        }
      } else {
        await newProduct.save();
      }
    }

    return NextResponse.json({
      success: true,
      product: newProduct,
      autoPublished,
    });
  } catch (error: any) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create product" },
      { status: 500 }
    );
  }
}
