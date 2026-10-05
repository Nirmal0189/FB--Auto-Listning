import mongoose, { Schema, Document, Model } from "mongoose";

export type ListingStatus =
  | "NOT_LISTED"
  | "DRAFT"
  | "READY"
  | "VALIDATING"
  | "PUBLISHING"
  | "PENDING"
  | "LIVE"
  | "FAILED"
  | "PAUSED";

export interface IFlipkartAiListing {
  title: string;
  highlights: string[];
  description: string;
  searchKeywords: string[];
  specifications: Record<string, string>;
  suggestedCategory: {
    id: string;
    name: string;
  };
  qualityScore: number;
  missingFields: string[];
  generatedAt: Date;
}

export interface IFlipkartValidation {
  isValid: boolean;
  score: number;
  validFields: string[];
  warnings: string[];
  criticalErrors: string[];
  validatedAt: Date;
}

export interface IFlipkartInfo {
  enabled: boolean;
  listingId?: string;
  listingStatus: ListingStatus;
  sku?: string;
  categoryId?: string;
  categoryName?: string;
  vertical?: string;
  fsn?: string; // Flipkart Serial Number
  lastSyncedAt?: Date;
  lastPublishedAt?: Date;
  lastError?: string;
  lastApiResponse?: unknown;
  aiListing?: IFlipkartAiListing;
  validation?: IFlipkartValidation;
}

export interface IProductDimensions {
  length: number;
  width: number;
  height: number;
  unit: "cm" | "mm" | "inch";
}

export interface IProductWeight {
  value: number;
  unit: "g" | "kg";
}

export interface IProduct extends Document {
  name: string;
  sku: string;
  category: string;
  brand: string;
  material: string;
  color: string;
  price: number;
  mrp: number;
  stock: number;
  dimensions: IProductDimensions;
  weight: IProductWeight;
  packageDimensions: IProductDimensions;
  packageWeight: IProductWeight;
  hsnCode?: string;
  gstRate?: number;
  countryOfOrigin?: string;
  manufacturerDetails?: string;
  description: string;
  features: string[];
  specifications: Record<string, string>;
  images: string[];
  flipkart: IFlipkartInfo;
  createdAt: Date;
  updatedAt: Date;
}

const ProductDimensionsSchema = new Schema(
  {
    length: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    unit: { type: String, enum: ["cm", "mm", "inch"], default: "cm" },
  },
  { _id: false }
);

const ProductWeightSchema = new Schema(
  {
    value: { type: Number, required: true },
    unit: { type: String, enum: ["g", "kg"], default: "kg" },
  },
  { _id: false }
);

const FlipkartAiListingSchema = new Schema(
  {
    title: { type: String, default: "" },
    highlights: [{ type: String }],
    description: { type: String, default: "" },
    searchKeywords: [{ type: String }],
    specifications: { type: Map, of: String, default: {} },
    suggestedCategory: {
      id: { type: String, default: "" },
      name: { type: String, default: "" },
    },
    qualityScore: { type: Number, default: 0 },
    missingFields: [{ type: String }],
    generatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const FlipkartValidationSchema = new Schema(
  {
    isValid: { type: Boolean, default: false },
    score: { type: Number, default: 0 },
    validFields: [{ type: String }],
    warnings: [{ type: String }],
    criticalErrors: [{ type: String }],
    validatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const FlipkartInfoSchema = new Schema(
  {
    enabled: { type: Boolean, default: true },
    listingId: { type: String, index: true },
    listingStatus: {
      type: String,
      enum: [
        "NOT_LISTED",
        "DRAFT",
        "READY",
        "VALIDATING",
        "PUBLISHING",
        "PENDING",
        "LIVE",
        "FAILED",
        "PAUSED",
      ],
      default: "NOT_LISTED",
      index: true,
    },
    sku: { type: String, index: true },
    categoryId: { type: String },
    categoryName: { type: String },
    vertical: { type: String },
    fsn: { type: String },
    lastSyncedAt: { type: Date },
    lastPublishedAt: { type: Date },
    lastError: { type: String },
    lastApiResponse: { type: Schema.Types.Mixed },
    aiListing: { type: FlipkartAiListingSchema, default: null },
    validation: { type: FlipkartValidationSchema, default: null },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    category: { type: String, required: true, trim: true },
    brand: { type: String, default: "FP AUTO", trim: true },
    material: { type: String, required: true, trim: true },
    color: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    dimensions: { type: ProductDimensionsSchema, required: true },
    weight: { type: ProductWeightSchema, required: true },
    packageDimensions: { type: ProductDimensionsSchema, required: true },
    packageWeight: { type: ProductWeightSchema, required: true },
    hsnCode: { type: String, default: "3923" },
    gstRate: { type: Number, default: 18 },
    countryOfOrigin: { type: String, default: "India" },
    manufacturerDetails: {
      type: String,
      default: "FP AUTO Pvt. Ltd., Plot 108, GIDC Industrial Estate, Gujarat, India",
    },
    description: { type: String, required: true },
    features: [{ type: String }],
    specifications: { type: Map, of: String, default: {} },
    images: [{ type: String }],
    flipkart: { type: FlipkartInfoSchema, default: () => ({ enabled: true, listingStatus: "NOT_LISTED" }) },
  },
  {
    timestamps: true,
  }
);

// Prevent model overwrite in Next.js hot reload
export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
