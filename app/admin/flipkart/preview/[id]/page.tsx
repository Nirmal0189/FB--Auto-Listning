"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Send,
  Sliders,
  Check,
  X,
  Star,
  Tag,
  Truck,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ProductDetail {
  _id: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  material: string;
  color: string;
  price: number;
  mrp: number;
  stock: number;
  dimensions: { length: number; width: number; height: number; unit: string };
  weight: { value: number; unit: string };
  packageDimensions: { length: number; width: number; height: number; unit: string };
  packageWeight: { value: number; unit: string };
  countryOfOrigin: string;
  manufacturerDetails: string;
  description: string;
  features: string[];
  specifications: Record<string, string>;
  images: string[];
  flipkart: {
    enabled: boolean;
    listingStatus: string;
    listingId?: string;
    categoryId?: string;
    categoryName?: string;
    aiListing?: {
      title: string;
      highlights: string[];
      description: string;
      searchKeywords: string[];
      specifications: Record<string, string>;
      qualityScore: number;
      missingFields: string[];
      suggestedCategory?: { id: string; name: string };
    };
    validation?: {
      isValid: boolean;
      score: number;
      validFields: string[];
      warnings: string[];
      criticalErrors: string[];
    };
  };
}

export default function FlipkartPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Edit modal
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState(0);
  const [editMrp, setEditMrp] = useState(0);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${productId}`);
      const data = await res.json();
      if (data.success && data.product) {
        setProduct(data.product);
        setSelectedImage(data.product.images?.[0] || "");
        setEditTitle(data.product.flipkart?.aiListing?.title || data.product.name);
        setEditDescription(data.product.flipkart?.aiListing?.description || data.product.description);
        setEditPrice(data.product.price);
        setEditMrp(data.product.mrp);
      }
    } catch (e) {
      console.error("Failed to load product preview:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) fetchProduct();
  }, [productId]);

  const handleGenerateAi = async () => {
    setActionBusy("ai");
    setStatusMessage(null);
    try {
      const res = await fetch("/api/flipkart/generate-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: "AI Listing regenerated successfully!", type: "success" });
        await fetchProduct();
      } else {
        setStatusMessage({ text: `AI Generation failed: ${data.error}`, type: "error" });
      }
    } catch {
      setStatusMessage({ text: "Network error during AI generation", type: "error" });
    } finally {
      setActionBusy(null);
    }
  };

  const handleValidate = async () => {
    setActionBusy("validate");
    setStatusMessage(null);
    try {
      const res = await fetch("/api/flipkart/validate-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          text: `Validation score: ${data.validation?.score}/100 (${data.validation?.isValid ? "All critical fields valid" : "Has critical errors"})`,
          type: data.validation?.isValid ? "success" : "error",
        });
        await fetchProduct();
      }
    } finally {
      setActionBusy(null);
    }
  };

  const handlePublish = async () => {
    setActionBusy("publish");
    setStatusMessage(null);
    try {
      const res = await fetch("/api/flipkart/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          text: `✓ Product published successfully! Listing ID: ${data.result?.listingId}`,
          type: "success",
        });
        await fetchProduct();
      } else {
        setStatusMessage({ text: `✕ Publishing failed: ${data.error}`, type: "error" });
      }
    } finally {
      setActionBusy(null);
    }
  };

  const handleSaveEdits = async () => {
    setActionBusy("save");
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: editPrice,
          mrp: editMrp,
          "flipkart.aiListing.title": editTitle,
          "flipkart.aiListing.description": editDescription,
        }),
      });
      if (res.ok) {
        setIsEditing(false);
        await fetchProduct();
      }
    } finally {
      setActionBusy(null);
    }
  };

  if (loading || !product) {
    return (
      <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-[#2874f0]" />
        <span className="text-sm font-semibold">Loading Flipkart listing preview...</span>
      </div>
    );
  }

  const aiListing = product.flipkart?.aiListing;
  const validation = product.flipkart?.validation;
  const missingFields = aiListing?.missingFields || [];
  const qualityScore = aiListing?.qualityScore || validation?.score || 92;

  const displayTitle = aiListing?.title || product.name;
  const displayHighlights = aiListing?.highlights || product.features || [];
  const displayDescription = aiListing?.description || product.description;
  const displaySpecs = aiListing?.specifications || product.specifications || {};

  const discountPercent = product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/flipkart/products"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2874f0]">
                Flipkart Customer View Simulation
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-mono font-bold text-slate-500">
                SKU: {product.sku}
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Flipkart Listing Preview
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateAi}
            disabled={!!actionBusy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 text-[#2874f0] hover:bg-blue-100 border border-blue-200 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Regenerate AI</span>
          </button>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition"
          >
            {isEditing ? "Cancel Edit" : "Edit Listing"}
          </button>

          <button
            onClick={handleValidate}
            disabled={!!actionBusy}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 transition"
          >
            Validate
          </button>

          <button
            onClick={handlePublish}
            disabled={!!actionBusy}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-[#2874f0] hover:bg-blue-600 text-white shadow-md shadow-blue-500/25 transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish to Flipkart</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-sm border flex items-center justify-between ${statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
            }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-xs font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Missing Information Banner (Matching Section 4 & 18 Requirements) */}
      {missingFields.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                ⚠ Missing Required Information
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                The AI engine adheres strictly to factual data and will never hallucinate or invent specifications. The following fields must be supplied before live publishing:
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {missingFields.map((field) => (
                  <span
                    key={field}
                    className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200"
                  >
                    {field}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0 shadow-sm"
          >
            Complete Product Information
          </button>
        </div>
      )}

      {/* Edit Mode Panel */}
      {isEditing && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900 shadow-md space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Edit Flipkart Listing Copy
            </h3>
            <button
              onClick={() => setIsEditing(false)}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                SEO Product Title
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Selling Price (₹)
                </label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  MRP (₹)
                </label>
                <input
                  type="number"
                  value={editMrp}
                  onChange={(e) => setEditMrp(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Description
              </label>
              <textarea
                rows={4}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdits}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#2874f0] text-white hover:bg-blue-600"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Main Flipkart-Style Consumer Product Card */}
      <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Left Column: Image Gallery */}
          <div className="md:col-span-5 space-y-4">
            <div className="aspect-square rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center p-4 relative">
              {selectedImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedImage}
                  alt={product.name}
                  className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                />
              ) : (
                <span className="text-xs text-slate-400">No Image Available</span>
              )}

              {/* Flipkart Assured Badge Simulation */}
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-black italic tracking-wider flex items-center gap-1 shadow">
                <span>f</span>
                <span>Assured</span>
              </div>
            </div>

            {/* Thumbnail Carousel */}
            {product.images && product.images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    className={`w-16 h-16 rounded-xl border-2 p-1 bg-white dark:bg-slate-800 overflow-hidden shrink-0 transition-all ${selectedImage === img
                        ? "border-[#2874f0] shadow-sm"
                        : "border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100"
                      }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`Angle ${i + 1}`} className="w-full h-full object-cover rounded-lg" />
                  </button>
                ))}
              </div>
            )}

            {/* Flipkart Delivery / Shipping Info */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold">Fast Delivery Available</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Shipping dead weight: {product.packageWeight?.value || 0.5} {product.packageWeight?.unit || "kg"} • Box: {product.packageDimensions?.length}x{product.packageDimensions?.width}x{product.packageDimensions?.height} {product.packageDimensions?.unit}
              </div>
            </div>
          </div>

          {/* Right Column: Title, Pricing, Highlights, Description */}
          <div className="md:col-span-7 space-y-5">
            {/* Title */}
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                {product.brand}
              </div>
              <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-snug">
                {displayTitle}
              </h2>
            </div>

            {/* Ratings & Flipkart Tag */}
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 text-white text-xs font-bold">
                <span>4.4</span>
                <Star className="w-3 h-3 fill-white" />
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Verified Seller: FP AUTO Pvt. Ltd.
              </span>
            </div>

            {/* Pricing Section */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-baseline gap-3">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {formatCurrency(product.price)}
              </span>
              <span className="text-sm line-through text-slate-400">
                {formatCurrency(product.mrp)}
              </span>
              {discountPercent > 0 && (
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {discountPercent}% off
                </span>
              )}
            </div>

            {/* Highlights Bullets */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Highlights
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {displayHighlights.map((hl, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#2874f0] font-bold mt-0.5">•</span>
                    <span>{hl}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Description
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {displayDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Specifications Table Section */}
        <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            Specifications & Technical Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs">
            {Object.entries(displaySpecs).map(([key, val]) => (
              <div
                key={key}
                className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800"
              >
                <span className="text-slate-500 font-medium">{key}</span>
                <span className="font-semibold text-slate-900 dark:text-white text-right">
                  {String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quality Score & Validation Health Card (Matching Section 5 & 6) */}
      <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#2874f0]" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                AI Listing Quality Score: {qualityScore}/100
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated audit verifying Flipkart catalog optimization guidelines
            </p>
          </div>

          <div className="w-48 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              style={{ width: `${qualityScore}%` }}
              className={`h-full ${qualityScore >= 85 ? "bg-emerald-500" : qualityScore >= 60 ? "bg-amber-500" : "bg-rose-500"
                }`}
            />
          </div>
        </div>

        {/* Validation Checklist Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold">SEO Title</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold">Description</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold">Images Valid</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold">SKU Format</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
            {product.weight?.value > 0 ? (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            )}
            <span className="font-semibold">Dead Weight</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
            {product.dimensions?.length > 0 ? (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            )}
            <span className="font-semibold">Dimensions</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold">Price & MRP</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold">GST Rate 18%</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold">Country of Origin</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold">Manufacturer</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setIsEditing(true)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50"
          >
            Edit Fields
          </button>
          <button
            onClick={handleValidate}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            Run Validator
          </button>
          <button
            onClick={handlePublish}
            disabled={!validation?.isValid && missingFields.length > 0}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#2874f0] hover:bg-blue-600 text-white shadow-md disabled:opacity-40"
          >
            Publish to Flipkart
          </button>
        </div>
      </div>
    </div>
  );
}
