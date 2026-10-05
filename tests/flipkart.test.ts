import assert from "node:assert";
import { encrypt, decrypt, redactSensitiveData } from "../lib/crypto";
import { parseFlipkartError, FlipkartRateLimitError, FlipkartDuplicateSkuError } from "../lib/flipkart/errors";
import { suggestCategoryForProduct } from "../lib/flipkart/categories";
import { checkMissingFactualFields } from "../lib/flipkart/ai";
import { validateFlipkartListing } from "../lib/flipkart/validator";
import { SAMPLE_PARTH_PRODUCTS } from "../lib/sampleProducts";

async function runAcceptanceTests() {
  console.log("=== RUNNING ACCEPTANCE TESTS FOR FLIPKART AUTO-LISTING SYSTEM ===");

  // 1. Crypto & Secret Vault Test
  console.log("\n[Test 1] AES-256-GCM Encryption and Decryption");
  const originalSecret = "flipkart_oauth_token_secret_12345";
  const encrypted = encrypt(originalSecret);
  assert.notStrictEqual(encrypted, originalSecret);
  const decrypted = decrypt(encrypted);
  assert.strictEqual(decrypted, originalSecret, "Decrypted text must match original secret");
  console.log("✓ AES-256-GCM encryption and decryption verified");

  // 2. Secret Redaction Test (Section 16: Never expose secrets in client responses/logs)
  console.log("\n[Test 2] Credential Redaction in Activity Logs & API Responses");
  const sensitivePayload = {
    client_id: "parth_client_id",
    client_secret: "super_secret_key_999",
    access_token: "fk_tok_live_888",
    refresh_token: "fk_ref_live_777",
    product: {
      sku: "PPP-RACK-3L-SS",
      token_type: "bearer",
    },
  };
  const redacted = redactSensitiveData(sensitivePayload);
  assert.strictEqual(redacted.client_secret, "[REDACTED]");
  assert.strictEqual(redacted.access_token, "[REDACTED]");
  assert.strictEqual(redacted.refresh_token, "[REDACTED]");
  assert.strictEqual(redacted.product.sku, "PPP-RACK-3L-SS");
  console.log("✓ Secret redaction successfully sanitizes tokens and passwords");

  // 3. Category Suggestions & Taxonomy Mapping (Section 8: Do not invent unsupported categories)
  console.log("\n[Test 3] Official Category Taxonomy Suggestions");
  const catRack = suggestCategoryForProduct("Storage Shelf Rack", "Kitchen", "Stainless Steel");
  assert.strictEqual(catRack.vertical, "storage_rack");
  const catFilm = suggestCategoryForProduct("Stretch Film Roll", "Industrial", "LLDPE");
  assert.strictEqual(catFilm.vertical, "packaging_material");
  const catBox = suggestCategoryForProduct("Modular Kitchen Container", "Food Storage", "PP Plastic");
  assert.strictEqual(catBox.vertical, "container_jar");
  console.log("✓ Official category taxonomy suggestions verified");

  // 4. AI Safety & Factual Specs Checks (Section 18: Never invent missing specs)
  console.log("\n[Test 4] AI Safety Guardrails (No Spec Hallucination)");
  const completeProduct: any = SAMPLE_PARTH_PRODUCTS[0];
  const missingInComplete = checkMissingFactualFields(completeProduct);
  assert.strictEqual(missingInComplete.length, 0, "Complete product should have 0 missing factual fields");

  const incompleteProduct: any = SAMPLE_PARTH_PRODUCTS[5]; // Has missing dimensions and weight
  const missingInIncomplete = checkMissingFactualFields(incompleteProduct);
  assert.ok(missingInIncomplete.includes("Dimensions"), "Must flag missing dimensions");
  assert.ok(missingInIncomplete.includes("Weight"), "Must flag missing weight");
  console.log("✓ AI safety checks correctly detect missing factual specs without fabricating numbers");

  // 5. Listing Validator (Section 6: 14 required fields, Quality Score calculation)
  console.log("\n[Test 5] 14-Field Listing Validator & Quality Score");
  const validResult = await validateFlipkartListing(completeProduct);
  assert.strictEqual(validResult.isValid, true, "Complete product must pass validation");
  assert.ok(validResult.score >= 80, "Quality score should be >= 80 for complete product");
  assert.strictEqual(validResult.criticalCount, 0, "Complete product should have 0 critical errors");
  console.log(`✓ Valid product score: ${validResult.score}/100 with ${validResult.validCount} valid fields`);

  const invalidResult = await validateFlipkartListing(incompleteProduct);
  assert.strictEqual(invalidResult.isValid, false, "Incomplete product must fail validation");
  assert.ok(invalidResult.criticalCount > 0, "Incomplete product must have critical errors");
  console.log(`✓ Incomplete product blocked from publishing: ${invalidResult.criticalCount} critical errors found`);

  // 6. Structured Error Handling (Section 12: Rate limits, Duplicate SKUs, Auth expiry)
  console.log("\n[Test 6] Structured Error Handling");
  const rateLimitErr = parseFlipkartError({ status: 429, message: "Rate limit reached" });
  assert.strictEqual(rateLimitErr.statusCode, 429);
  assert.strictEqual(rateLimitErr.code, "RATE_LIMIT_EXCEEDED");

  const duplicateSkuErr = new FlipkartDuplicateSkuError("PPP-RACK-3L-SS");
  assert.strictEqual(duplicateSkuErr.code, "DUPLICATE_LISTING");
  assert.strictEqual(duplicateSkuErr.statusCode, 409);
  console.log("✓ Structured error handling and friendly messages verified");

  console.log("\n=======================================================");
  console.log("✓ ALL 6 TEST SUITES PASSED CLEANLY!");
  console.log("=======================================================\n");
}

runAcceptanceTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
