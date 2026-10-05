import type { Metadata } from "next";
import "./globals.css";
import AdminNavigation from "@/components/AdminNavigation";

export const metadata: Metadata = {
  title: "FP AUTO - Flipkart Auto-Listing System",
  description: "Official AI-Powered Flipkart Seller Auto-Listing & Catalog Management for FP AUTO Pvt. Ltd.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AdminNavigation>{children}</AdminNavigation>
      </body>
    </html>
  );
}
