"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Sparkles,
  CheckCircle,
  Eye,
  RefreshCw,
  Search,
  Package,
  Layers,
  ArrowRight,
  Database,
  ExternalLink,
} from "lucide-react";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

interface ProductItem {
  _id: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  price: number;
  mrp: number;
  stock: number;
  material: string;
  color: string;
  images: string[];
  flipkart: {
    enabled: boolean;
    listingStatus: string;
    listingId?: string;
    lastPublishedAt?: string;
    aiListing?: {
      title: string;
      qualityScore: number;
    };
  };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  // New product modal state
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formCategory, setFormCategory] = useState("Plastic Containers & Jars");
  const [formMaterial, setFormMaterial] = useState("Virgin Polypropylene (PP)");
  const [formColor, setFormColor] = useState("Transparent");
  const [formPrice, setFormPrice] = useState(499);
  const [formMrp, setFormMrp] = useState(899);
  const [formStock, setFormStock] = useState(50);
  const [formLength, setFormLength] = useState(25);
  const [formWidth, setFormWidth] = useState(15);
  const [formHeight, setFormHeight] = useState(12);
  const [formWeight, setFormWeight] = useState(0.45);
  const [formPkgLength, setFormPkgLength] = useState(28);
  const [formPkgWidth, setFormPkgWidth] = useState(18);
  const [formPkgHeight, setFormPkgHeight] = useState(15);
  const [formPkgWeight, setFormPkgWeight] = useState(0.6);
  const [formDescription, setFormDescription] = useState("");

  const fetchProducts = async (seed = false) => {
    try {
      setLoading(true);
      const url = seed ? "/api/products?seed=true" : "/api/products";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setProducts(json.products || []);
      }
    } catch (e) {
      console.error("Failed to load products:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleGenerateAi = async (productId: string) => {
    setBusyAction(`ai_${productId}`);
    try {
      const res = await fetch("/api/flipkart/generate-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.autoPublished) {
          alert("✓ AI listing generated AND automatically published to Flipkart (Automatic Mode enabled)!");
        }
        await fetchProducts();
      } else {
        alert(`Failed to generate AI listing: ${data.error}`);
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyAction("create");
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          sku: formSku,
          category: formCategory,
          brand: "FP AUTO",
          material: formMaterial,
          color: formColor,
          price: formPrice,
          mrp: formMrp,
          stock: formStock,
          dimensions: { length: formLength, width: formWidth, height: formHeight, unit: "cm" },
          weight: { value: formWeight, unit: "kg" },
          packageDimensions: { length: formPkgLength, width: formPkgWidth, height: formPkgHeight, unit: "cm" },
          packageWeight: { value: formPkgWeight, unit: "kg" },
          hsnCode: "3923",
          gstRate: 18,
          countryOfOrigin: "India",
          manufacturerDetails: "FP AUTO Pvt. Ltd., Plot 108, GIDC Industrial Estate, Gujarat, India",
          description: formDescription || `Heavy-duty industrial polymer product manufactured by FP AUTO Pvt. Ltd.`,
          features: ["Virgin industrial polymer", "High mechanical impact strength", "Eco-friendly recyclable"],
          images: ["https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80"],
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNewModalOpen(false);
        if (data.autoPublished) {
          alert("✓ New product created and automatically published to Flipkart!");
        }
        await fetchProducts();
      } else {
        alert(`Failed to create product: ${data.error}`);
      }
    } finally {
      setBusyAction(null);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              FP AUTO Pvt. Ltd.
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#2874f0]">
              Product Inventory
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Product Catalog & AI Actions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your company catalog. Click &ldquo;Generate Flipkart Listing with AI&rdquo; to prepare high-converting SEO listings based on factual specifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchProducts(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
            title="Seed / Reset sample products"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Seed Sample Catalog</span>
          </button>

          <button
            onClick={() => setNewModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#2874f0] hover:bg-blue-600 text-white shadow-md shadow-blue-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search products by SKU or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((product) => {
          const isBusy = busyAction === `ai_${product._id}`;
          const isLive = product.flipkart?.listingStatus === "LIVE";
          const isPending = product.flipkart?.listingStatus === "PENDING";
          const isFailed = product.flipkart?.listingStatus === "FAILED";

          return (
            <div
              key={product._id}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-slate-500">
                    {product.sku}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isLive
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : isPending
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : isFailed
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                  >
                    {product.flipkart?.listingStatus || "NOT_LISTED"}
                  </span>
                </div>

                <div className="h-12">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                    {product.name}
                  </h3>
                </div>

                <div className="text-xs text-slate-500">
                  <span>{product.category}</span> • <span>{product.material}</span>
                </div>

                <div className="flex items-baseline justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-slate-900 dark:text-white">
                      {formatCurrency(product.price)}
                    </span>
                    <span className="text-xs line-through text-slate-400">
                      {formatCurrency(product.mrp)}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">Stock: {product.stock}</span>
                </div>
              </div>

              {/* Action Buttons (Matching Section 4 Requirement) */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  onClick={() => handleGenerateAi(product._id)}
                  disabled={isBusy}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-[#2874f0] hover:bg-blue-600 text-white shadow-sm shadow-blue-500/20 transition disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isBusy ? "animate-spin" : ""}`} />
                  <span>{isBusy ? "Generating with AI..." : "Generate Flipkart Listing with AI"}</span>
                </button>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/flipkart/preview/${product._id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Flipkart Preview</span>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Product Modal */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Add New FP AUTO Product
              </h3>
              <button onClick={() => setNewModalOpen(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Product Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. 5 Layer Modular Storage Drawer"
                    className="w-full mt-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value.toUpperCase())}
                    placeholder="PPP-MOD-5L-DRAWER"
                    className="w-full mt-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full mt-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="Plastic Containers & Jars">Plastic Containers & Jars</option>
                    <option value="Storage Racks & Shelves">Storage Racks & Shelves</option>
                    <option value="Stretch Film & Packaging Rolls">Stretch Film & Packaging Rolls</option>
                    <option value="Industrial Storage Crates & Bins">Industrial Storage Crates & Bins</option>
                    <option value="Plastic Bottles & Liquid Dispensers">Plastic Bottles & Liquid Dispensers</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Material</label>
                  <input
                    type="text"
                    required
                    value={formMaterial}
                    onChange={(e) => setFormMaterial(e.target.value)}
                    className="w-full mt-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Color</label>
                  <input
                    type="text"
                    required
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="w-full mt-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Selling Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full mt-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">MRP (₹)</label>
                  <input
                    type="number"
                    required
                    value={formMrp}
                    onChange={(e) => setFormMrp(Number(e.target.value))}
                    className="w-full mt-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Stock Inventory</label>
                  <input
                    type="number"
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full mt-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Factual Specs (Dimensions & Weight) */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  Factual Dimensions & Weight (Required for Flipkart Shipping)
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label>Length (cm)</label>
                    <input
                      type="number"
                      value={formLength}
                      onChange={(e) => setFormLength(Number(e.target.value))}
                      className="w-full mt-0.5 p-1.5 rounded-lg border bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label>Width (cm)</label>
                    <input
                      type="number"
                      value={formWidth}
                      onChange={(e) => setFormWidth(Number(e.target.value))}
                      className="w-full mt-0.5 p-1.5 rounded-lg border bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label>Height (cm)</label>
                    <input
                      type="number"
                      value={formHeight}
                      onChange={(e) => setFormHeight(Number(e.target.value))}
                      className="w-full mt-0.5 p-1.5 rounded-lg border bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label>Net Weight (kg)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={formWeight}
                      onChange={(e) => setFormWeight(Number(e.target.value))}
                      className="w-full mt-0.5 p-1.5 rounded-lg border bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Product Description</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Base factual description..."
                  className="w-full mt-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busyAction === "create"}
                  className="px-5 py-2 rounded-xl bg-[#2874f0] text-white font-bold hover:bg-blue-600 shadow-md"
                >
                  {busyAction === "create" ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
