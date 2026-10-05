import { encrypt, decrypt } from "../crypto";
import { FlipkartIntegration } from "../../models/FlipkartIntegration";
import { FlipkartAuthError, FlipkartApiError } from "./errors";
import { connectToDatabase } from "../db/mongodb";

export interface FlipkartTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  account_id?: string;
}

export function getFlipkartCredentials() {
  const clientId = process.env.FLIPKART_CLIENT_ID || "";
  const clientSecret = process.env.FLIPKART_CLIENT_SECRET || "";
  const redirectUri = process.env.FLIPKART_REDIRECT_URI || "http://localhost:3000/api/flipkart/callback";
  const environment = (process.env.FLIPKART_ENVIRONMENT || "sandbox") as "sandbox" | "production";
  const apiBaseUrl =
    process.env.FLIPKART_API_BASE_URL ||
    (environment === "production" ? "https://api.flipkart.net" : "https://sandbox-api.flipkart.net");

  return {
    clientId,
    clientSecret,
    redirectUri,
    environment,
    apiBaseUrl,
  };
}

/**
 * Builds the official Flipkart Seller Hub OAuth 2.0 authorization URL
 */
export function getAuthorizationUrl(state: string): string {
  const { clientId, redirectUri, environment } = getFlipkartCredentials();
  
  const authHost =
    environment === "production"
      ? "https://seller.flipkart.com/oauth/authorize"
      : "https://seller-sandbox.flipkart.net/oauth/authorize";

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "Seller_Api",
  });

  return `${authHost}?${params.toString()}`;
}

/**
 * Exchanges authorization code for Access & Refresh tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<FlipkartTokenResponse> {
  const { clientId, clientSecret, redirectUri, apiBaseUrl } = getFlipkartCredentials();

  if (!clientId || !clientSecret) {
    throw new FlipkartAuthError("FLIPKART_CLIENT_ID and FLIPKART_CLIENT_SECRET must be configured");
  }

  const tokenUrl = `${apiBaseUrl}/oauth-rest/oauth/token`;
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  try {
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Flipkart OAuth Token Exchange Error:", res.status, errText);
      throw new FlipkartAuthError(`Flipkart OAuth token exchange failed: ${res.statusText}`, { status: res.status, body: errText });
    }

    const tokenData: FlipkartTokenResponse = await res.json();
    return tokenData;
  } catch (error: unknown) {
    if (error instanceof FlipkartApiError) throw error;
    throw new FlipkartAuthError("Network error during Flipkart OAuth token exchange", error);
  }
}

/**
 * Refreshes an expired access token using the stored refresh token
 */
export async function refreshAccessToken(refreshTokenPlain: string): Promise<FlipkartTokenResponse> {
  const { clientId, clientSecret, apiBaseUrl } = getFlipkartCredentials();

  if (!clientId || !clientSecret) {
    throw new FlipkartAuthError("FLIPKART_CLIENT_ID and FLIPKART_CLIENT_SECRET must be configured");
  }

  const tokenUrl = `${apiBaseUrl}/oauth-rest/oauth/token`;
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshTokenPlain,
  });

  try {
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Flipkart Token Refresh Error:", res.status, errText);
      throw new FlipkartAuthError("Failed to refresh Flipkart access token. Please re-authenticate.", { status: res.status, body: errText });
    }

    const tokenData: FlipkartTokenResponse = await res.json();
    return tokenData;
  } catch (error: unknown) {
    if (error instanceof FlipkartApiError) throw error;
    throw new FlipkartAuthError("Network error during token refresh", error);
  }
}

/**
 * Retrieves valid decrypted access token from database, auto-refreshing if expired or near expiry
 */
export async function getValidAccessToken(): Promise<string> {
  await connectToDatabase();
  const integration = await FlipkartIntegration.findOne();

  if (!integration || !integration.isConnected || !integration.encryptedAccessToken) {
    throw new FlipkartAuthError("Flipkart is not connected. Please connect your seller account first.");
  }

  const now = new Date();
  const expiresAt = integration.tokenExpiresAt ? new Date(integration.tokenExpiresAt) : new Date(0);
  // Proactive refresh if token expires in less than 5 minutes
  const isExpiringSoon = expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;

  if (isExpiringSoon && integration.encryptedRefreshToken) {
    try {
      const plainRefreshToken = decrypt(integration.encryptedRefreshToken);
      const newTokens = await refreshAccessToken(plainRefreshToken);

      integration.encryptedAccessToken = encrypt(newTokens.access_token);
      if (newTokens.refresh_token) {
        integration.encryptedRefreshToken = encrypt(newTokens.refresh_token);
      }
      integration.tokenExpiresAt = new Date(Date.now() + (newTokens.expires_in || 21600) * 1000);
      integration.apiStatus = "HEALTHY";
      await integration.save();

      return newTokens.access_token;
    } catch (refreshErr) {
      integration.apiStatus = "EXPIRED";
      await integration.save();
      throw refreshErr;
    }
  }

  return decrypt(integration.encryptedAccessToken);
}

/**
 * Saves authenticated tokens securely into the database
 */
export async function saveAuthenticatedTokens(tokens: FlipkartTokenResponse, sellerInfo?: { sellerId?: string; sellerName?: string; email?: string }) {
  await connectToDatabase();
  let integration = await FlipkartIntegration.findOne();

  if (!integration) {
    integration = new FlipkartIntegration();
  }

  const { environment } = getFlipkartCredentials();

  integration.isConnected = true;
  integration.apiStatus = "HEALTHY";
  integration.environment = environment;
  integration.encryptedAccessToken = encrypt(tokens.access_token);
  if (tokens.refresh_token) {
    integration.encryptedRefreshToken = encrypt(tokens.refresh_token);
  }
  integration.tokenExpiresAt = new Date(Date.now() + (tokens.expires_in || 21600) * 1000);

  if (sellerInfo?.sellerId) integration.sellerId = sellerInfo.sellerId;
  if (sellerInfo?.sellerName) integration.sellerName = sellerInfo.sellerName;
  if (sellerInfo?.email) integration.email = sellerInfo.email;

  await integration.save();
  return integration;
}

/**
 * Disconnects Flipkart account and clears encrypted tokens
 */
export async function disconnectFlipkart() {
  await connectToDatabase();
  const integration = await FlipkartIntegration.findOne();
  if (integration) {
    integration.isConnected = false;
    integration.apiStatus = "DISCONNECTED";
    integration.encryptedAccessToken = "";
    integration.encryptedRefreshToken = "";
    integration.tokenExpiresAt = undefined;
    await integration.save();
  }
  return true;
}
