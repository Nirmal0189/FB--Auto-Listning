import { flipkartClient } from "./client";

export interface FlipkartCategory {
  id: string;
  name: string;
  vertical: string;
  path: string;
  hasSubcategories: boolean;
  requiredAttributes: string[];
  recommendedAttributes: string[];
}

/**
 * Standard official Flipkart verticals and category mappings
 * relevant to FP AUTO Pvt. Ltd. (Packaging, Industrial Plastic, Kitchen/Household Storage)
 */
export const OFFICIAL_FLIPKART_CATEGORIES: FlipkartCategory[] = [
  {
    id: "CAT_CONTAINER_JAR",
    name: "Plastic Containers & Jars",
    vertical: "container_jar",
    path: "Home & Kitchen > Kitchen Storage & Containers > Containers & Jars",
    hasSubcategories: false,
    requiredAttributes: [
      "brand",
      "material",
      "color",
      "capacity",
      "airtight",
      "dishwasher_safe",
      "country_of_origin",
      "manufacturer_details",
    ],
    recommendedAttributes: ["microwave_safe", "bpa_free", "finish"],
  },
  {
    id: "CAT_STORAGE_RACK",
    name: "Storage Racks & Shelves",
    vertical: "storage_rack",
    path: "Home & Kitchen > Kitchen Storage & Organizers > Racks & Holders",
    hasSubcategories: false,
    requiredAttributes: [
      "brand",
      "material",
      "number_of_shelves",
      "mount_type",
      "color",
      "weight_capacity",
      "country_of_origin",
      "manufacturer_details",
    ],
    recommendedAttributes: ["rust_proof", "diy_assembly", "finish"],
  },
  {
    id: "CAT_PACKAGING_FILM",
    name: "Stretch Film & Packaging Rolls",
    vertical: "packaging_material",
    path: "Industrial & Scientific Supplies > Packaging & Shipping > Stretch Film",
    hasSubcategories: false,
    requiredAttributes: [
      "brand",
      "material",
      "thickness_microns",
      "roll_length",
      "width",
      "color",
      "country_of_origin",
      "manufacturer_details",
    ],
    recommendedAttributes: ["core_diameter", "tensile_strength"],
  },
  {
    id: "CAT_PLASTIC_CRATE",
    name: "Industrial Storage Crates & Bins",
    vertical: "storage_crate",
    path: "Industrial & Scientific Supplies > Material Handling > Storage Crates",
    hasSubcategories: false,
    requiredAttributes: [
      "brand",
      "material",
      "capacity_liters",
      "color",
      "stackable",
      "country_of_origin",
      "manufacturer_details",
    ],
    recommendedAttributes: ["load_capacity_kg", "handles"],
  },
  {
    id: "CAT_PLASTIC_BOTTLE",
    name: "Plastic Bottles & Liquid Dispensers",
    vertical: "dispenser_bottle",
    path: "Home & Kitchen > Kitchen Storage & Containers > Water Bottles",
    hasSubcategories: false,
    requiredAttributes: [
      "brand",
      "material",
      "capacity_ml",
      "color",
      "spill_proof",
      "country_of_origin",
      "manufacturer_details",
    ],
    recommendedAttributes: ["neck_size_mm", "bpa_free"],
  },
];

/**
 * Retrieves official categories from Flipkart API if available, falling back to cached official taxonomy
 */
export async function getFlipkartCategories(): Promise<FlipkartCategory[]> {
  try {
    const isDry = await flipkartClient.isDryRun();
    if (!isDry) {
      const res = await flipkartClient.request<{ categories?: FlipkartCategory[] }>({
        method: "GET",
        endpoint: "/taxonomy/v1/categories",
        operationName: "GET_CATEGORIES",
        timeoutMs: 8000,
        maxRetries: 1,
      });

      if (res.data && Array.isArray(res.data.categories) && res.data.categories.length > 0) {
        return res.data.categories;
      }
    }
  } catch (err) {
    console.warn("[getFlipkartCategories] Using standard official taxonomy:", err);
  }

  return OFFICIAL_FLIPKART_CATEGORIES;
}

/**
 * Suggests the best matching category for a product
 */
export function suggestCategoryForProduct(name: string, category: string, material: string): FlipkartCategory {
  const combined = `${name} ${category} ${material}`.toLowerCase();

  if (combined.includes("rack") || combined.includes("shelf") || combined.includes("stand")) {
    return OFFICIAL_FLIPKART_CATEGORIES.find((c) => c.vertical === "storage_rack")!;
  }
  if (combined.includes("film") || combined.includes("roll") || combined.includes("stretch") || combined.includes("wrap")) {
    return OFFICIAL_FLIPKART_CATEGORIES.find((c) => c.vertical === "packaging_material")!;
  }
  if (combined.includes("crate") || combined.includes("bin") || combined.includes("box")) {
    return OFFICIAL_FLIPKART_CATEGORIES.find((c) => c.vertical === "storage_crate")!;
  }
  if (combined.includes("bottle") || combined.includes("dispenser") || combined.includes("can")) {
    return OFFICIAL_FLIPKART_CATEGORIES.find((c) => c.vertical === "dispenser_bottle")!;
  }

  // Default to containers & jars
  return OFFICIAL_FLIPKART_CATEGORIES.find((c) => c.vertical === "container_jar") || OFFICIAL_FLIPKART_CATEGORIES[0];
}
