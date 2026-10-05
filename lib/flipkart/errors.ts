export type FlipkartErrorCode =
  | "INVALID_SKU"
  | "INVALID_CATEGORY"
  | "MISSING_REQUIRED_ATTRIBUTE"
  | "INVALID_IMAGE_URL"
  | "AUTH_EXPIRED"
  | "UNAUTHORIZED"
  | "RATE_LIMIT_EXCEEDED"
  | "INVALID_PRICE"
  | "INVALID_INVENTORY"
  | "DUPLICATE_LISTING"
  | "API_UNAVAILABLE"
  | "VALIDATION_FAILED"
  | "TIMEOUT"
  | "UNKNOWN_ERROR";

export class FlipkartApiError extends Error {
  public code: FlipkartErrorCode;
  public statusCode: number;
  public userMessage: string;
  public details?: unknown;
  public correlationId?: string;

  constructor(
    message: string,
    options: {
      code?: FlipkartErrorCode;
      statusCode?: number;
      userMessage?: string;
      details?: unknown;
      correlationId?: string;
    } = {}
  ) {
    super(message);
    this.name = "FlipkartApiError";
    this.code = options.code || "UNKNOWN_ERROR";
    this.statusCode = options.statusCode || 500;
    this.userMessage = options.userMessage || message;
    this.details = options.details;
    this.correlationId = options.correlationId;
  }
}

export class FlipkartAuthError extends FlipkartApiError {
  constructor(message = "Flipkart authentication expired or invalid. Please re-authenticate.", details?: unknown) {
    super(message, {
      code: "AUTH_EXPIRED",
      statusCode: 401,
      userMessage: "Flipkart Seller session has expired. Please re-connect via OAuth in Integrations.",
      details,
    });
    this.name = "FlipkartAuthError";
  }
}

export class FlipkartRateLimitError extends FlipkartApiError {
  public retryAfterSeconds: number;

  constructor(retryAfter = 60, details?: unknown) {
    super(`Flipkart API rate limit exceeded. Retry after ${retryAfter}s`, {
      code: "RATE_LIMIT_EXCEEDED",
      statusCode: 429,
      userMessage: `Flipkart API request rate limit reached. The system will automatically pause and retry in ${retryAfter} seconds.`,
      details,
    });
    this.name = "FlipkartRateLimitError";
    this.retryAfterSeconds = retryAfter;
  }
}

export class FlipkartValidationError extends FlipkartApiError {
  public fieldErrors: string[];

  constructor(fieldErrors: string[], details?: unknown) {
    super(`Listing validation failed with ${fieldErrors.length} issues`, {
      code: "VALIDATION_FAILED",
      statusCode: 400,
      userMessage: `Listing validation failed: ${fieldErrors.slice(0, 3).join(", ")}${fieldErrors.length > 3 ? "..." : ""}`,
      details,
    });
    this.name = "FlipkartValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export class FlipkartDuplicateSkuError extends FlipkartApiError {
  constructor(sku: string) {
    super(`SKU "${sku}" is already listed on Flipkart under this seller account`, {
      code: "DUPLICATE_LISTING",
      statusCode: 409,
      userMessage: `Product SKU "${sku}" already exists on Flipkart. Use "Update Listing" instead of creating a duplicate.`,
    });
    this.name = "FlipkartDuplicateSkuError";
  }
}

/**
 * Maps raw HTTP responses / Flipkart error codes into user-friendly error explanations
 */
export function parseFlipkartError(error: unknown, correlationId?: string): FlipkartApiError {
  if (error instanceof FlipkartApiError) {
    if (correlationId && !error.correlationId) {
      error.correlationId = correlationId;
    }
    return error;
  }

  const err = error as { status?: number; response?: { status?: number; data?: any }; message?: string };
  const status = err?.response?.status || err?.status || 500;
  const rawMsg = err?.response?.data?.message || err?.message || "Unknown error communicating with Flipkart API";
  const rawData = err?.response?.data;

  if (status === 401 || status === 403) {
    return new FlipkartAuthError(rawMsg, rawData);
  }

  if (status === 429) {
    return new FlipkartRateLimitError(60, rawData);
  }

  if (status === 409) {
    return new FlipkartDuplicateSkuError("Current SKU");
  }

  return new FlipkartApiError(rawMsg, {
    statusCode: status,
    code: status >= 500 ? "API_UNAVAILABLE" : "UNKNOWN_ERROR",
    userMessage: status >= 500 ? "Flipkart Marketplace API is temporarily unavailable. Please try again shortly." : rawMsg,
    details: rawData,
    correlationId,
  });
}
