export interface AttributeDefinition {
  id: string;
  name: string;
  description: string;
  type: "string" | "number" | "boolean" | "enum" | "dimension" | "weight";
  required: boolean;
  options?: string[];
  unit?: string[];
}

export const COMMON_FLIPKART_ATTRIBUTES: AttributeDefinition[] = [
  {
    id: "brand",
    name: "Brand Name",
    description: "Registered brand name of the product",
    type: "string",
    required: true,
  },
  {
    id: "material",
    name: "Material",
    description: "Primary construction material (e.g., Virgin PP Plastic, HDPE, PET)",
    type: "string",
    required: true,
  },
  {
    id: "color",
    name: "Color",
    description: "Primary product color",
    type: "string",
    required: true,
  },
  {
    id: "country_of_origin",
    name: "Country of Origin",
    description: "Mandatory legal requirement under Legal Metrology Act (e.g., India)",
    type: "string",
    required: true,
  },
  {
    id: "manufacturer_details",
    name: "Manufacturer / Packer Details",
    description: "Full registered business address of manufacturer or packer",
    type: "string",
    required: true,
  },
  {
    id: "hsn_code",
    name: "HSN Code",
    description: "Harmonized System Nomenclature code for GST compliance (e.g., 3923, 3924)",
    type: "string",
    required: true,
  },
  {
    id: "gst_rate",
    name: "GST Rate (%)",
    description: "Applicable GST slab (18% for plastic goods)",
    type: "number",
    required: true,
  },
  {
    id: "package_dimensions",
    name: "Package Dimensions (L x W x H)",
    description: "Length, Width, and Height of packaged box in cm",
    type: "dimension",
    required: true,
    unit: ["cm", "mm", "inch"],
  },
  {
    id: "package_weight",
    name: "Package Weight",
    description: "Total dead weight of shipping package in kg or g",
    type: "weight",
    required: true,
    unit: ["kg", "g"],
  },
];
