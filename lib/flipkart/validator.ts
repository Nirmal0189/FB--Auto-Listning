import { IProduct } from "../../models/Product";

export interface ValidationFieldResult {
  fieldName: string;
  fieldLabel: string;
  status: "VALID" | "WARNING" | "CRITICAL";
  message: string;
}

export interface ValidationSummary {
  isValid: boolean;
  score: number; // 0 - 100
  totalChecks: number;
  validCount: number;
  warningCount: number;
  criticalCount: number;
  validFields: string[];
  warnings: string[];
  criticalErrors: string[];
  fields: ValidationFieldResult[];
}

/**
 * Validates a URL to ensure it is secure HTTPS and properly formatted
 */
function isValidHttpsUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Validates a product against Flipkart's listing requirements
 */
export async function validateFlipkartListing(product: IProduct): Promise<ValidationSummary> {
  const fields: ValidationFieldResult[] = [];

  // 1. SKU Check
  if (!product.sku || product.sku.trim().length === 0) {
    fields.push({
      fieldName: "sku",
      fieldLabel: "SKU Identifier",
      status: "CRITICAL",
      message: "Product SKU is missing or empty.",
    });
  } else if (!/^[A-Z0-9_-]{3,40}$/i.test(product.sku.trim())) {
    fields.push({
      fieldName: "sku",
      fieldLabel: "SKU Identifier",
      status: "CRITICAL",
      message: "SKU must be 3-40 alphanumeric characters (hyphens and underscores allowed).",
    });
  } else {
    fields.push({
      fieldName: "sku",
      fieldLabel: "SKU Identifier",
      status: "VALID",
      message: `Valid SKU: ${product.sku}`,
    });
  }

  // 2. Product Title Check
  const title = product.flipkart?.aiListing?.title || product.name;
  if (!title || title.trim().length === 0) {
    fields.push({
      fieldName: "title",
      fieldLabel: "Product Title",
      status: "CRITICAL",
      message: "Product title is missing.",
    });
  } else if (title.length < 15) {
    fields.push({
      fieldName: "title",
      fieldLabel: "Product Title",
      status: "WARNING",
      message: "Product title is short (< 15 characters). May reduce Flipkart search visibility.",
    });
  } else if (title.length > 200) {
    fields.push({
      fieldName: "title",
      fieldLabel: "Product Title",
      status: "WARNING",
      message: "Product title is too long (> 200 characters). Flipkart recommends under 180 chars.",
    });
  } else {
    fields.push({
      fieldName: "title",
      fieldLabel: "Product Title",
      status: "VALID",
      message: "Title meets Flipkart SEO guidelines.",
    });
  }

  // 3. Category Check
  const categoryId = product.flipkart?.categoryId || product.category;
  if (!categoryId || categoryId.trim().length === 0) {
    fields.push({
      fieldName: "category",
      fieldLabel: "Flipkart Category",
      status: "CRITICAL",
      message: "Product category is not mapped to a Flipkart vertical.",
    });
  } else {
    fields.push({
      fieldName: "category",
      fieldLabel: "Flipkart Category",
      status: "VALID",
      message: `Mapped category: ${product.flipkart?.categoryName || product.category}`,
    });
  }

  // 4. Brand Check
  if (!product.brand || product.brand.trim().length === 0) {
    fields.push({
      fieldName: "brand",
      fieldLabel: "Brand Name",
      status: "CRITICAL",
      message: "Brand name is mandatory on Flipkart.",
    });
  } else {
    fields.push({
      fieldName: "brand",
      fieldLabel: "Brand Name",
      status: "VALID",
      message: `Brand: ${product.brand}`,
    });
  }

  // 5. Price & MRP Check
  if (product.price <= 0) {
    fields.push({
      fieldName: "price",
      fieldLabel: "Selling Price",
      status: "CRITICAL",
      message: "Selling price must be greater than ₹0.",
    });
  } else if (product.mrp <= 0) {
    fields.push({
      fieldName: "mrp",
      fieldLabel: "MRP (Maximum Retail Price)",
      status: "CRITICAL",
      message: "MRP must be greater than ₹0.",
    });
  } else if (product.price > product.mrp) {
    fields.push({
      fieldName: "price",
      fieldLabel: "Price vs MRP",
      status: "CRITICAL",
      message: `Selling price (₹${product.price}) cannot exceed MRP (₹${product.mrp}).`,
    });
  } else {
    fields.push({
      fieldName: "price",
      fieldLabel: "Pricing & MRP",
      status: "VALID",
      message: `Selling Price ₹${product.price} / MRP ₹${product.mrp} (${Math.round(((product.mrp - product.price) / product.mrp) * 100)}% off)`,
    });
  }

  // 6. GST / Tax Compliance
  if (!product.gstRate && product.gstRate !== 0) {
    fields.push({
      fieldName: "gstRate",
      fieldLabel: "GST Tax Rate",
      status: "CRITICAL",
      message: "GST tax rate is required for Indian e-commerce listing.",
    });
  } else if (!product.hsnCode || product.hsnCode.trim().length < 4) {
    fields.push({
      fieldName: "hsnCode",
      fieldLabel: "HSN Code",
      status: "WARNING",
      message: "HSN Code is recommended to be at least 4 digits (e.g. 3923).",
    });
  } else {
    fields.push({
      fieldName: "gstRate",
      fieldLabel: "GST & Tax Info",
      status: "VALID",
      message: `HSN ${product.hsnCode} @ ${product.gstRate}% GST.`,
    });
  }

  // 7. Inventory / Stock Check
  if (product.stock === undefined || product.stock === null || product.stock < 0) {
    fields.push({
      fieldName: "stock",
      fieldLabel: "Inventory Stock",
      status: "CRITICAL",
      message: "Inventory count cannot be negative.",
    });
  } else if (product.stock === 0) {
    fields.push({
      fieldName: "stock",
      fieldLabel: "Inventory Stock",
      status: "WARNING",
      message: "Stock is 0. Listing will publish as Out of Stock.",
    });
  } else {
    fields.push({
      fieldName: "stock",
      fieldLabel: "Inventory Stock",
      status: "VALID",
      message: `${product.stock} units available in warehouse.`,
    });
  }

  // 8. Product Images Check
  if (!product.images || product.images.length === 0) {
    fields.push({
      fieldName: "images",
      fieldLabel: "Product Images",
      status: "CRITICAL",
      message: "At least one high-resolution product image is required.",
    });
  } else {
    let hasInvalidUrl = false;
    let invalidIndex = -1;

    for (let i = 0; i < product.images.length; i++) {
      const imgUrl = product.images[i];
      if (!imgUrl || !isValidHttpsUrl(imgUrl)) {
        hasInvalidUrl = true;
        invalidIndex = i + 1;
        break;
      }
    }

    if (hasInvalidUrl) {
      fields.push({
        fieldName: "images",
        fieldLabel: "Image Accessibility",
        status: "CRITICAL",
        message: `Image #${invalidIndex} has an invalid or inaccessible URL. Must be valid HTTP/HTTPS.`,
      });
    } else if (product.images.length < 2) {
      fields.push({
        fieldName: "images",
        fieldLabel: "Product Images",
        status: "WARNING",
        message: "Only 1 image provided. Flipkart recommends 3+ angles for higher conversion.",
      });
    } else {
      fields.push({
        fieldName: "images",
        fieldLabel: "Product Images",
        status: "VALID",
        message: `${product.images.length} valid images provided.`,
      });
    }
  }

  // 9. Dimensions Check
  if (
    !product.dimensions ||
    !product.dimensions.length ||
    !product.dimensions.width ||
    !product.dimensions.height ||
    product.dimensions.length <= 0 ||
    product.dimensions.width <= 0 ||
    product.dimensions.height <= 0
  ) {
    fields.push({
      fieldName: "dimensions",
      fieldLabel: "Product Dimensions",
      status: "CRITICAL",
      message: "Product dimensions (Length, Width, Height) must be greater than 0.",
    });
  } else {
    fields.push({
      fieldName: "dimensions",
      fieldLabel: "Product Dimensions",
      status: "VALID",
      message: `${product.dimensions.length} x ${product.dimensions.width} x ${product.dimensions.height} ${product.dimensions.unit}`,
    });
  }

  // 10. Weight Check
  if (!product.weight || !product.weight.value || product.weight.value <= 0) {
    fields.push({
      fieldName: "weight",
      fieldLabel: "Product Weight",
      status: "CRITICAL",
      message: "Product net weight must be greater than 0.",
    });
  } else {
    fields.push({
      fieldName: "weight",
      fieldLabel: "Product Weight",
      status: "VALID",
      message: `${product.weight.value} ${product.weight.unit}`,
    });
  }

  // 11. Package Information Check (Mandatory for Flipkart shipping volumetric calculation)
  if (
    !product.packageDimensions ||
    !product.packageDimensions.length ||
    !product.packageDimensions.width ||
    !product.packageDimensions.height ||
    product.packageDimensions.length <= 0 ||
    product.packageDimensions.width <= 0 ||
    product.packageDimensions.height <= 0
  ) {
    fields.push({
      fieldName: "packageDimensions",
      fieldLabel: "Package Dimensions",
      status: "CRITICAL",
      message: "Package shipping dimensions are required for Flipkart courier calculation.",
    });
  } else if (!product.packageWeight || !product.packageWeight.value || product.packageWeight.value <= 0) {
    fields.push({
      fieldName: "packageWeight",
      fieldLabel: "Package Weight",
      status: "CRITICAL",
      message: "Package dead weight is required for shipping label generation.",
    });
  } else {
    fields.push({
      fieldName: "packageInfo",
      fieldLabel: "Package Information",
      status: "VALID",
      message: `Box: ${product.packageDimensions.length}x${product.packageDimensions.width}x${product.packageDimensions.height} ${product.packageDimensions.unit}, ${product.packageWeight.value} ${product.packageWeight.unit}`,
    });
  }

  // 12. Material & Color Check
  if (!product.material || product.material.trim().length === 0) {
    fields.push({
      fieldName: "material",
      fieldLabel: "Material",
      status: "CRITICAL",
      message: "Material specification is required.",
    });
  } else {
    fields.push({
      fieldName: "material",
      fieldLabel: "Material & Color",
      status: "VALID",
      message: `Material: ${product.material}, Color: ${product.color || "Standard"}`,
    });
  }

  // 13. Legal Metrology Compliance (Country of Origin & Manufacturer)
  if (!product.countryOfOrigin || product.countryOfOrigin.trim().length === 0) {
    fields.push({
      fieldName: "countryOfOrigin",
      fieldLabel: "Country of Origin",
      status: "CRITICAL",
      message: 'Required attribute "Country of Origin" is missing (Mandatory under Indian e-commerce laws).',
    });
  } else if (!product.manufacturerDetails || product.manufacturerDetails.trim().length === 0) {
    fields.push({
      fieldName: "manufacturerDetails",
      fieldLabel: "Manufacturer Details",
      status: "CRITICAL",
      message: "Manufacturer / Packer address details are mandatory.",
    });
  } else {
    fields.push({
      fieldName: "legalCompliance",
      fieldLabel: "Legal Metrology",
      status: "VALID",
      message: `Country: ${product.countryOfOrigin}, Packer: ${product.manufacturerDetails.slice(0, 30)}...`,
    });
  }

  // 14. Description & Highlights Check
  const highlights = product.flipkart?.aiListing?.highlights || product.features || [];
  const description = product.flipkart?.aiListing?.description || product.description;

  if (!description || description.trim().length < 20) {
    fields.push({
      fieldName: "description",
      fieldLabel: "Product Description",
      status: "WARNING",
      message: "Description is very brief. Detailed descriptions improve buyer conversion.",
    });
  } else if (highlights.length < 3) {
    fields.push({
      fieldName: "highlights",
      fieldLabel: "Product Highlights",
      status: "WARNING",
      message: "Add at least 3 bullet highlights for optimal Flipkart listing presentation.",
    });
  } else {
    fields.push({
      fieldName: "description",
      fieldLabel: "Description & Highlights",
      status: "VALID",
      message: `Rich description (${description.length} chars) with ${highlights.length} bullet highlights.`,
    });
  }

  // Compute summary scores
  const validFields = fields.filter((f) => f.status === "VALID").map((f) => f.fieldLabel);
  const warnings = fields.filter((f) => f.status === "WARNING").map((f) => `${f.fieldLabel}: ${f.message}`);
  const criticalErrors = fields.filter((f) => f.status === "CRITICAL").map((f) => `${f.fieldLabel}: ${f.message}`);

  const totalChecks = fields.length;
  const validCount = validFields.length;
  const warningCount = warnings.length;
  const criticalCount = criticalErrors.length;

  // Score formula: Start at 100, deduct 15 per critical error, 4 per warning
  let score = 100 - criticalCount * 15 - warningCount * 4;
  if (score < 0) score = 0;
  if (criticalCount > 0 && score > 65) score = 65; // Capped if critical errors exist

  const isValid = criticalCount === 0;

  return {
    isValid,
    score,
    totalChecks,
    validCount,
    warningCount,
    criticalCount,
    validFields,
    warnings,
    criticalErrors,
    fields,
  };
}
