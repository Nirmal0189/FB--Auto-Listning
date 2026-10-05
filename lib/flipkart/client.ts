import { getFlipkartCredentials, getValidAccessToken } from "./auth";
import { parseFlipkartError, FlipkartRateLimitError, FlipkartApiError } from "./errors";
import { generateCorrelationId } from "../utils";
import { redactSensitiveData } from "../crypto";
import { FlipkartLog } from "../../models/FlipkartLog";
import { FlipkartIntegration } from "../../models/FlipkartIntegration";
import { connectToDatabase } from "../db/mongodb";

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  endpoint: string;
  data?: unknown;
  params?: Record<string, string | number | boolean>;
  timeoutMs?: number;
  maxRetries?: number;
  correlationId?: string;
  operationName?: string;
  sku?: string;
  productId?: string;
  productName?: string;
}

export class FlipkartClient {
  private baseTimeoutMs: number = 15000;
  private defaultMaxRetries: number = 3;

  /**
   * Checks whether the current system is in Dry Run / Test mode
   */
  public async isDryRun(): Promise<boolean> {
    try {
      await connectToDatabase();
      const integration = await FlipkartIntegration.findOne();
      return integration ? integration.isDryRun : true;
    } catch {
      return true;
    }
  }

  /**
   * Core HTTP request executor with timeout, backoff, correlation ID, and logging
   */
  public async request<T>(options: RequestOptions): Promise<{ data: T; status: number; correlationId: string }> {
    const correlationId = options.correlationId || generateCorrelationId();
    const startTime = Date.now();
    const maxRetries = options.maxRetries ?? this.defaultMaxRetries;
    const timeoutMs = options.timeoutMs ?? this.baseTimeoutMs;

    const { apiBaseUrl } = getFlipkartCredentials();
    let url = `${apiBaseUrl}${options.endpoint.startsWith("/") ? options.endpoint : `/${options.endpoint}`}`;

    if (options.params) {
      const urlObj = new URL(url);
      Object.entries(options.params).forEach(([key, val]) => {
        urlObj.searchParams.append(key, String(val));
      });
      url = urlObj.toString();
    }

    let attempt = 0;
    let lastError: unknown = null;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        const token = await getValidAccessToken();

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Request-Id": correlationId,
        };

        const res = await fetch(url, {
          method: options.method || "GET",
          headers,
          body: options.data ? JSON.stringify(options.data) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timer);

        const durationMs = Date.now() - startTime;

        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get("Retry-After") || "5", 10);
          console.warn(`[FlipkartClient] 429 Rate Limit hit. Backing off ${retryAfter}s (attempt ${attempt}/${maxRetries})`);
          if (attempt <= maxRetries) {
            await new Promise((r) => setTimeout(r, retryAfter * 1000));
            continue;
          }
          throw new FlipkartRateLimitError(retryAfter);
        }

        if (!res.ok) {
          const rawErr = await res.text();
          let parsedBody;
          try {
            parsedBody = JSON.parse(rawErr);
          } catch {
            parsedBody = { raw: rawErr };
          }

          // Retry on transient 5xx server errors
          if (res.status >= 500 && attempt <= maxRetries) {
            const backoff = Math.pow(2, attempt) * 500;
            console.warn(`[FlipkartClient] Transient ${res.status} error, retrying in ${backoff}ms`);
            await new Promise((r) => setTimeout(r, backoff));
            continue;
          }

          const parsedError = parseFlipkartError({
            status: res.status,
            response: { status: res.status, data: parsedBody },
            message: `Flipkart API error: ${res.status} ${res.statusText}`,
          }, correlationId);

          await this.logActivity({
            operation: (options.operationName as any) || "HEALTH_CHECK",
            result: "FAILED",
            apiStatus: String(res.status),
            durationMs,
            sku: options.sku,
            productName: options.productName,
            error: parsedError.userMessage,
            details: redactSensitiveData({ endpoint: options.endpoint, errorDetails: parsedBody }),
          });

          throw parsedError;
        }

        let data: T;
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          data = await res.json();
        } else {
          data = (await res.text()) as unknown as T;
        }

        await this.logActivity({
          operation: (options.operationName as any) || "HEALTH_CHECK",
          result: "SUCCESS",
          apiStatus: String(res.status),
          durationMs,
          sku: options.sku,
          productName: options.productName,
          details: redactSensitiveData({ endpoint: options.endpoint }),
        });

        return { data, status: res.status, correlationId };
      } catch (err: unknown) {
        lastError = err;
        // Don't retry if it was client error or unauthorized
        if (err instanceof FlipkartApiError && (err.statusCode < 500 && err.statusCode !== 429)) {
          break;
        }
        if (attempt <= maxRetries) {
          const delay = Math.pow(2, attempt) * 500;
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    const durationMs = Date.now() - startTime;
    const finalErr = parseFlipkartError(lastError, correlationId);

    await this.logActivity({
      operation: (options.operationName as any) || "HEALTH_CHECK",
      result: "FAILED",
      apiStatus: String(finalErr.statusCode),
      durationMs,
      sku: options.sku,
      productName: options.productName,
      error: finalErr.userMessage,
      details: redactSensitiveData({ endpoint: options.endpoint, error: finalErr.message }),
    });

    throw finalErr;
  }

  /**
   * Health check to test live official Flipkart connectivity
   */
  public async healthCheck(): Promise<{ isHealthy: boolean; latencyMs: number; message: string; mode: string }> {
    const startTime = Date.now();
    try {
      const isDry = await this.isDryRun();
      if (isDry) {
        return {
          isHealthy: true,
          latencyMs: 12,
          message: "Dry Run Simulation Mode active (Sandbox ready).",
          mode: "DRY_RUN",
        };
      }

      // Check seller account details on official endpoint
      const result = await this.request<{ seller_id?: string; name?: string }>({
        method: "GET",
        endpoint: "/sellers/v3/profile",
        operationName: "HEALTH_CHECK",
        timeoutMs: 8000,
        maxRetries: 1,
      });

      const latencyMs = Date.now() - startTime;
      return {
        isHealthy: true,
        latencyMs,
        message: `Flipkart API Healthy (Seller: ${result.data?.seller_id || "Active"})`,
        mode: "PRODUCTION",
      };
    } catch (err: any) {
      return {
        isHealthy: false,
        latencyMs: Date.now() - startTime,
        message: err.userMessage || err.message || "Failed to reach Flipkart API",
        mode: "ERROR",
      };
    }
  }

  /**
   * Records sanitized activity logs
   */
  private async logActivity(logData: {
    operation: string;
    result: "SUCCESS" | "WARNING" | "FAILED";
    apiStatus: string;
    durationMs: number;
    sku?: string;
    productName?: string;
    error?: string;
    flipkartListingId?: string;
    details?: Record<string, unknown>;
  }) {
    try {
      await connectToDatabase();
      const isDry = await this.isDryRun();

      await FlipkartLog.create({
        timestamp: new Date(),
        operation: logData.operation,
        result: logData.result,
        apiStatus: logData.apiStatus,
        durationMs: logData.durationMs,
        sku: logData.sku || "",
        productName: logData.productName || "",
        error: logData.error,
        flipkartListingId: logData.flipkartListingId,
        isDryRun: isDry,
        details: logData.details,
        user: "Flipkart Automation Engine",
      });
    } catch (e) {
      console.error("[FlipkartClient] Failed to persist activity log:", e);
    }
  }
}

export const flipkartClient = new FlipkartClient();
