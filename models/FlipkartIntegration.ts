import mongoose, { Schema, Document, Model } from "mongoose";

export type FlipkartEnvironment = "sandbox" | "production";
export type PublishingMode = "MANUAL_APPROVAL" | "AUTOMATIC";
export type ApiHealthStatus = "HEALTHY" | "DEGRADED" | "DISCONNECTED" | "EXPIRED" | "ERROR";

export interface IFlipkartStats {
  totalListings: number;
  liveListings: number;
  pendingListings: number;
  failedListings: number;
  publishedToday: number;
  inventorySyncedToday: number;
  priceUpdatesToday: number;
  failedApiRequestsToday: number;
  lastStatReset: Date;
}

export interface IFlipkartIntegration extends Document {
  isConnected: boolean;
  sellerId?: string;
  sellerName?: string;
  email?: string;
  locationId?: string;
  encryptedAccessToken?: string;
  encryptedRefreshToken?: string;
  tokenExpiresAt?: Date;
  apiStatus: ApiHealthStatus;
  lastHealthCheckAt?: Date;
  lastHealthCheckError?: string;
  environment: FlipkartEnvironment;
  isDryRun: boolean; // Test / Dry Run mode vs live official production
  autoListing: boolean; // Automatic Flipkart Listing ON/OFF
  publishingMode: PublishingMode; // MANUAL_APPROVAL or AUTOMATIC
  autoInventorySync: boolean;
  autoPriceSync: boolean;
  aiListingGeneration: boolean;
  retryFailedListings: boolean;
  maxRetryAttempts: number;
  lastSyncAt?: Date;
  stats: IFlipkartStats;
  createdAt: Date;
  updatedAt: Date;
}

const FlipkartStatsSchema = new Schema(
  {
    totalListings: { type: Number, default: 0 },
    liveListings: { type: Number, default: 0 },
    pendingListings: { type: Number, default: 0 },
    failedListings: { type: Number, default: 0 },
    publishedToday: { type: Number, default: 0 },
    inventorySyncedToday: { type: Number, default: 0 },
    priceUpdatesToday: { type: Number, default: 0 },
    failedApiRequestsToday: { type: Number, default: 0 },
    lastStatReset: { type: Date, default: Date.now },
  },
  { _id: false }
);

const FlipkartIntegrationSchema = new Schema<IFlipkartIntegration>(
  {
    isConnected: { type: Boolean, default: false },
    sellerId: { type: String, default: "" },
    sellerName: { type: String, default: "" },
    email: { type: String, default: "" },
    locationId: { type: String, default: "" },
    encryptedAccessToken: { type: String, default: "" },
    encryptedRefreshToken: { type: String, default: "" },
    tokenExpiresAt: { type: Date },
    apiStatus: {
      type: String,
      enum: ["HEALTHY", "DEGRADED", "DISCONNECTED", "EXPIRED", "ERROR"],
      default: "DISCONNECTED",
    },
    lastHealthCheckAt: { type: Date },
    lastHealthCheckError: { type: String },
    environment: {
      type: String,
      enum: ["sandbox", "production"],
      default: "sandbox",
    },
    isDryRun: { type: Boolean, default: true },
    autoListing: { type: Boolean, default: false },
    publishingMode: {
      type: String,
      enum: ["MANUAL_APPROVAL", "AUTOMATIC"],
      default: "MANUAL_APPROVAL",
    },
    autoInventorySync: { type: Boolean, default: true },
    autoPriceSync: { type: Boolean, default: true },
    aiListingGeneration: { type: Boolean, default: true },
    retryFailedListings: { type: Boolean, default: true },
    maxRetryAttempts: { type: Number, default: 3 },
    lastSyncAt: { type: Date },
    stats: {
      type: FlipkartStatsSchema,
      default: () => ({
        totalListings: 0,
        liveListings: 0,
        pendingListings: 0,
        failedListings: 0,
        publishedToday: 0,
        inventorySyncedToday: 0,
        priceUpdatesToday: 0,
        failedApiRequestsToday: 0,
        lastStatReset: new Date(),
      }),
    },
  },
  {
    timestamps: true,
  }
);

export const FlipkartIntegration: Model<IFlipkartIntegration> =
  mongoose.models.FlipkartIntegration ||
  mongoose.model<IFlipkartIntegration>("FlipkartIntegration", FlipkartIntegrationSchema);

export default FlipkartIntegration;
