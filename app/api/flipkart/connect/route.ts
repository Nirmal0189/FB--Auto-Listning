import { NextResponse } from "next/server";
import { getAuthorizationUrl, saveAuthenticatedTokens } from "@/lib/flipkart/auth";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mock = searchParams.get("mock");

    // Quick sandbox demo connection mode if user wants to test without full Flipkart developer portal OAuth callback
    if (mock === "true") {
      const mockTokens = {
        access_token: `mock_fk_tok_${crypto.randomBytes(16).toString("hex")}`,
        refresh_token: `mock_fk_ref_${crypto.randomBytes(16).toString("hex")}`,
        token_type: "bearer",
        expires_in: 21600,
        scope: "Seller_Api",
      };

      await saveAuthenticatedTokens(mockTokens, {
        sellerId: "PARTH_PLASTO_SELLER_01",
        sellerName: "FP AUTO Pvt. Ltd.",
        email: "sales@parthplastopack.com",
      });

      return NextResponse.redirect(new URL("/admin/integrations/flipkart?connected=true", request.url));
    }

    const state = crypto.randomBytes(16).toString("hex");
    const authUrl = getAuthorizationUrl(state);

    return NextResponse.json({
      success: true,
      authUrl,
      state,
    });
  } catch (error: any) {
    console.error("Flipkart connect error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to initiate Flipkart connection" },
      { status: 500 }
    );
  }
}
