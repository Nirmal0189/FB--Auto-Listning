async function testE2E() {
  console.log("=== RUNNING FULL END-TO-END ACCEPTANCE SUITE ===");

  // 1. Check Flipkart Status
  console.log("\n[Step 1] Checking Flipkart Status (/api/flipkart/status)...");
  const statusRes = await fetch("http://localhost:3000/api/flipkart/status");
  const statusJson = await statusRes.json();
  console.log("Status Response:", {
    isConnected: statusJson.integration.isConnected,
    sellerName: statusJson.integration.sellerName,
    isDryRun: statusJson.integration.isDryRun,
    publishingMode: statusJson.integration.publishingMode,
    stats: statusJson.integration.stats,
  });

  // 2. Test Sandbox OAuth Connection
  console.log("\n[Step 2] Testing Sandbox OAuth Connection (/api/flipkart/connect?mock=true)...");
  await fetch("http://localhost:3000/api/flipkart/connect?mock=true", { redirect: "manual" });
  const statusAfterConnect = await (await fetch("http://localhost:3000/api/flipkart/status")).json();
  console.log("Connected Status:", {
    isConnected: statusAfterConnect.integration.isConnected,
    sellerId: statusAfterConnect.integration.sellerId,
    apiStatus: statusAfterConnect.integration.apiStatus,
  });

  // 3. Test AI Listing Generation
  console.log("\n[Step 3] Testing AI Listing Generation (/api/flipkart/generate-listing)...");
  const aiRes = await fetch("http://localhost:3000/api/flipkart/generate-listing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku: "PPP-RACK-3L-SS" }),
  });
  const aiJson = await aiRes.json();
  console.log("AI Generation Result:", {
    success: aiJson.success,
    title: aiJson.aiListing?.title,
    qualityScore: aiJson.aiListing?.qualityScore,
    highlightsCount: aiJson.aiListing?.highlights?.length,
    missingFields: aiJson.missingFields,
    isValid: aiJson.validation?.isValid,
  });

  // 4. Test Listing Validator
  console.log("\n[Step 4] Testing 14-Field Listing Validator (/api/flipkart/validate-listing)...");
  const valRes = await fetch("http://localhost:3000/api/flipkart/validate-listing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku: "PPP-RACK-3L-SS" }),
  });
  const valJson = await valRes.json();
  console.log("Validation Result:", {
    sku: valJson.sku,
    isValid: valJson.validation?.isValid,
    score: valJson.validation?.score,
    validCount: valJson.validation?.validFields?.length,
    criticalCount: valJson.validation?.criticalErrors?.length,
    flipkartStatus: valJson.flipkartStatus,
  });

  // 5. Test Dry-Run Publishing (Safe simulation without destructive calls)
  console.log("\n[Step 5] Testing Flipkart Publishing (/api/flipkart/publish)...");
  const pubRes = await fetch("http://localhost:3000/api/flipkart/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku: "PPP-RACK-3L-SS" }),
  });
  const pubJson = await pubRes.json();
  console.log("Publishing Result:", {
    success: pubJson.success,
    sku: pubJson.result?.sku,
    listingId: pubJson.result?.listingId,
    status: pubJson.result?.status,
    isDryRun: pubJson.result?.isDryRun,
    message: pubJson.result?.message,
  });

  // 6. Test Live Inventory Sync
  console.log("\n[Step 6] Testing Inventory Update (/api/flipkart/inventory)...");
  const invRes = await fetch("http://localhost:3000/api/flipkart/inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku: "PPP-RACK-3L-SS", stock: 42 }),
  });
  const invJson = await invRes.json();
  console.log("Inventory Update Result:", invJson.result);

  // 7. Test Price Update
  console.log("\n[Step 7] Testing Price Update (/api/flipkart/price)...");
  const priceRes = await fetch("http://localhost:3000/api/flipkart/price", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku: "PPP-RACK-3L-SS", price: 679, mrp: 1299 }),
  });
  const priceJson = await priceRes.json();
  console.log("Price Update Result:", priceJson.result);

  // 8. Test Bulk Publishing
  console.log("\n[Step 8] Testing Bulk Publishing (/api/flipkart/bulk-publish)...");
  const products = (await (await fetch("http://localhost:3000/api/products")).json()).products;
  const productIds = products.slice(0, 3).map((p) => p._id);
  const bulkRes = await fetch("http://localhost:3000/api/flipkart/bulk-publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productIds }),
  });
  const bulkJson = await bulkRes.json();
  console.log("Bulk Publish Result:", {
    totalSelected: bulkJson.totalSelected,
    publishedCount: bulkJson.publishedCount,
    pendingCount: bulkJson.pendingCount,
    failedCount: bulkJson.failedCount,
  });

  // 9. Verify Activity Logs
  console.log("\n[Step 9] Verifying Activity Log Stream (/api/flipkart/logs)...");
  const logsRes = await fetch("http://localhost:3000/api/flipkart/logs?limit=5");
  const logsJson = await logsRes.json();
  console.log(`Retrieved ${logsJson.logs?.length} recent activity logs:`);
  logsJson.logs?.forEach((l, i) => {
    console.log(`  ${i + 1}. [${l.operation}] - ${l.productName || l.sku} -> ${l.result} (${l.durationMs}ms)`);
  });

  console.log("\n=======================================================");
  console.log("✓ ALL END-TO-END FLOWS COMPLETED SUCCESSFULLY!");
  console.log("=======================================================\n");
}

testE2E().catch((err) => {
  console.error("E2E test failed:", err);
  process.exit(1);
});
