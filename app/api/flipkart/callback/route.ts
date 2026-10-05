import { NextResponse } from "next/server";
import { exchangeCodeForTokens, saveAuthenticatedTokens } from "@/lib/flipkart/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      console.error("Flipkart OAuth returned error:", error, errorDescription);
      return NextResponse.redirect(
        new URL(`/admin/integrations/flipkart?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/admin/integrations/flipkart?error=Missing_authorization_code", request.url)
      );
    }

    const tokens = await exchangeCodeForTokens(code);
    await saveAuthenticatedTokens(tokens);

    return NextResponse.redirect(
      new URL("/admin/integrations/flipkart?connected=true", request.url)
    );
  } catch (err: any) {
    console.error("Flipkart callback error:", err);
    return NextResponse.redirect(
      new URL(`/admin/integrations/flipkart?error=${encodeURIComponent(err.userMessage || err.message || "OAuth exchange failed")}`, request.url)
    );
  }
}
