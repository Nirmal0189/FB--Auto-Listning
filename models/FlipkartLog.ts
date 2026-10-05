import mongoose, { Schema, Document, Model } from "mongoose";

export type FlipkartOperation =
  | "CREATE_LISTING"
  | "UPDATE_LISTING"
  | "UPDATE_INVENTORY"
  | "UPDATE_PRICE"
  | "VALIDATE"
  | "AI_GENERATE"
  | "SYNC_STATUS"
  | "AUTH_CONNECT"
  | "AUTH_REFRESH"
  | "HEALTH_CHECK"
  | "BULK_PUBLISH";

export type LogResult = "SUCCESS" | "WARNING" | "FAILED";

export interface IFlipkartLog extends Document {
  timestamp: Date;
  productId?: mongoose.Types.ObjectId;
  productName?: string;
  sku?: string;
  operation: FlipkartOperation;
  apiStatus?: string;
  result: LogResult;
  error?: string;
  user: string;
  durationMs: number;
  flipkartListingId?: string;
  isDryRun: boolean;
  details?: Record<string, unknown>;
  createdAt: Date;
}

const FlipkartLogSchema = new Schema<IFlipkartLog>(
  {
    timestamp: { type: Date, default: Date.now, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    productName: { type: String, default: "" },
    sku: { type: String, default: "", index: true },
    operation: {
      type: String,
      required: true,
      index: true,
      enum: [
        "CREATE_LISTING",
        "UPDATE_LISTING",
        "UPDATE_INVENTORY",
        "UPDATE_PRICE",
        "VALIDATE",
        "AI_GENERATE",
        "SYNC_STATUS",
        "AUTH_CONNECT",
        "AUTH_REFRESH",
        "HEALTH_CHECK",
        "BULK_PUBLISH",
      ],
    },
    apiStatus: { type: String, default: "200" },
    result: {
      type: String,
      required: true,
      enum: ["SUCCESS", "WARNING", "FAILED"],
      index: true,
    },
    error: { type: String },
    user: { type: String, default: "System Admin" },
    durationMs: { type: Number, default: 0 },
    flipkartListingId: { type: String },
    isDryRun: { type: Boolean, default: false },
    details: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const FlipkartLog: Model<IFlipkartLog> =
  mongoose.models.FlipkartLog ||
  mongoose.model<IFlipkartLog>("FlipkartLog", FlipkartLogSchema);

export default FlipkartLog;
