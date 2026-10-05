"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  ChevronDown,
  Eye,
  CheckSquare,
  Square,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

interface ProductItem {
  _id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  mrp: number;
  stock: number;
  brand: string;
  images: string[];
  flipkart: {
    enabled: boolean;
    listingStatus:
      | "NOT_LISTED"
      | "DRAFT"
      | "READY"
      | "VALIDATING"
      | "PUBLISHING"
      | "PENDING"
      | "LIVE"
      | "FAILED"
      | "PAUSED";
    listingId?: string;
    sku?: string;
    categoryId?: string;
    categoryName?: string;
    lastSyncedAt?: string;
    lastPublishedAt?: string;
    lastError?: string;
    aiListing?: {
      title: string;
      qualityScore: number;
      missingFields: string[];
    };
    validation?: {
      isValid: boolean;
      score: number;
      criticalErrors: string[];
      warnings: string[];
    };
  };
}

interface BulkPublishSummary {
  totalSelected: number;
  publishedCount: number;
  pendingCount: number;
  failedCount: number;
  results: {
    id: string;
    sku: string;
    name: string;
    status: "PUBLISHED" | "PENDING" | "FAILED";
    listingId?: string;
    error?: string;
  }[];
}

export default function FlipkartProductsBulkPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  // Bulk progress modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkSummary, setBulkSummary] = useState<BulkPublishSummary | null>(null);
  const [bulkErrorFilter, setBulkErrorFilter] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/products");
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

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || p.flipkart?.listingStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p) => p._id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Generate AI for a single product
  const handleGenerateAiSingle = async (productId: string) => {
    setProcessingAction(`ai_${productId}`);
    try {
      const res = await fetch("/api/flipkart/generate-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchProducts();
      } else {
        alert(`Failed to generate AI listing: ${data.error}`);
      }
    } catch {
      alert("Network error during AI generation");
    } finally {
      setProcessingAction(null);
    }
  };

  // Validate a single product
  const handleValidateSingle = async (productId: string) => {
    setProcessingAction(`val_${productId}`);
    try {
      const res = await fetch("/api/flipkart/validate-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchProducts();
      } else {
        alert(`Validation error: ${data.error}`);
      }
    } finally {
      setProcessingAction(null);
    }
  };

  // Publish a single product
  const handlePublishSingle = async (productId: string) => {
    setProcessingAction(`pub_${productId}`);
    try {
      const res = await fetch("/api/flipkart/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchProducts();
      } else {
        alert(`Failed to publish: ${data.error}`);
        await fetchProducts();
      }
    } finally {
      setProcessingAction(null);
    }
  };

  // Bulk Generate AI for selected products
  const handleBulkGenerateAi = async () => {
    if (selectedIds.length === 0) return;
    setProcessingAction("bulk_ai");
    try {
      for (const id of selectedIds) {
        await fetch("/api/flipkart/generate-listing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: id }),
        });
      }
      await fetchProducts();
    } finally {
      setProcessingAction(null);
    }
  };

  // Bulk Validate selected products
  const handleBulkValidate = async () => {
    if (selectedIds.length === 0) return;
    setProcessingAction("bulk_validate");
    try {
      for (const id of selectedIds) {
        await fetch("/api/flipkart/validate-listing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: id }),
        });
      }
      await fetchProducts();
    } finally {
      setProcessingAction(null);
    }
  };

  // Bulk Publish selected products
  const handleBulkPublish = async () => {
    if (selectedIds.length === 0) return;
    setProcessingAction("bulk_publish");
    try {
      const res = await fetch("/api/flipkart/bulk-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: selectedIds }),
      });
      const data = await res.json();
      if (data.success) {
        setBulkSummary(data);
        setBulkModalOpen(true);
        await fetchProducts();
      } else {
        alert(`Bulk publish failed: ${data.error}`);
      }
    } catch {
      alert("Network error during bulk publishing");
    } finally {
      setProcessingAction(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "LIVE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            LIVE
          </span>
        );
      case "PENDING":
      case "PUBLISHING":
      case "VALIDATING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            PENDING
          </span>
        );
      case "READY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#2874f0] border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2874f0]"></span>
            READY
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            FAILED
          </span>
        );
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800">
            DRAFT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
            NOT LISTED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Flipkart Integration
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#2874f0]">
              Bulk Automation
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Bulk Product Auto-Listing
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Batch generate AI titles, validate Flipkart-required attributes, and publish products safely with rate-limit queueing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchProducts}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm"
            title="Refresh Table"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Bulk Action Bar (Matching Section 9 Requirements) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Left Side: Select All & Batch Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
          >
            {selectedIds.length > 0 && selectedIds.length === filteredProducts.length ? (
              <CheckSquare className="w-4 h-4 text-[#2874f0]" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>Select All ({selectedIds.length}/{filteredProducts.length})</span>
          </button>

          <button
            onClick={handleBulkGenerateAi}
            disabled={selectedIds.length === 0 || !!processingAction}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-[#2874f0] border border-blue-200 dark:border-blue-800 disabled:opacity-40 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate AI ({selectedIds.length})</span>
          </button>

          <button
            onClick={handleBulkValidate}
            disabled={selectedIds.length === 0 || !!processingAction}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 transition"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Validate Selected</span>
          </button>

          <button
            onClick={handleBulkPublish}
            disabled={selectedIds.length === 0 || !!processingAction}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#2874f0] hover:bg-blue-600 text-white shadow-sm shadow-blue-500/20 disabled:opacity-40 transition"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>Publish Selected</span>
          </button>
        </div>

        {/* Right Side: Search and Status Filter */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search SKU or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="LIVE">Live</option>
            <option value="READY">Ready</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="NOT_LISTED">Not Listed</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4 w-10"></th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4">AI Quality</th>
                <th className="py-3 px-4">Flipkart Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = selectedIds.includes(p._id);
                  const isRowBusy = processingAction?.includes(p._id);
                  const qualityScore = p.flipkart?.aiListing?.qualityScore || p.flipkart?.validation?.score || 0;

                  return (
                    <tr
                      key={p._id}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleSelect(p._id)}
                          className="text-slate-400 hover:text-[#2874f0]"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#2874f0]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Product Name & Brand */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {p.brand} • {p.flipkart?.aiListing?.title ? "AI Title Ready" : "Original Title"}
                        </div>
                        {p.flipkart?.lastError && (
                          <div className="text-[10px] text-rose-600 font-semibold line-clamp-1 mt-0.5">
                            ✕ {p.flipkart.lastError}
                          </div>
                        )}
                      </td>

                      {/* SKU */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {p.sku}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {p.flipkart?.categoryName || p.category}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {formatCurrency(p.price)}
                        <span className="text-[10px] line-through text-slate-400 ml-1">
                          {formatCurrency(p.mrp)}
                        </span>
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-4">
                        <span
                          className={`font-bold ${
                            p.stock > 10
                              ? "text-slate-700 dark:text-slate-300"
                              : p.stock > 0
                              ? "text-amber-600"
                              : "text-rose-600"
                          }`}
                        >
                          {p.stock}
                        </span>
                      </td>

                      {/* AI Quality Score */}
                      <td className="py-3 px-4">
                        {p.flipkart?.aiListing ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div
                                style={{ width: `${qualityScore}%` }}
                                className={`h-full ${
                                  qualityScore >= 80
                                    ? "bg-emerald-500"
                                    : qualityScore >= 60
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                                }`}
                              />
                            </div>
                            <span className="font-bold text-[11px]">{qualityScore}/100</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">Not generated</span>
                        )}
                      </td>

                      {/* Flipkart Status */}
                      <td className="py-3 px-4">
                        {getStatusBadge(p.flipkart?.listingStatus || "NOT_LISTED")}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/flipkart/preview/${p._id}`}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                            title="Flipkart Style Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            onClick={() => handleGenerateAiSingle(p._id)}
                            disabled={isRowBusy}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-[#2874f0] hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 transition"
                            title="Generate AI Title, Highlights & Specs"
                          >
                            AI
                          </button>

                          <button
                            onClick={() => handleValidateSingle(p._id)}
                            disabled={isRowBusy}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                            title="Validate 14 required fields"
                          >
                            Validate
                          </button>

                          <button
                            onClick={() => handlePublishSingle(p._id)}
                            disabled={isRowBusy}
                            className="px-3 py-1 rounded-lg text-[11px] font-bold bg-[#2874f0] hover:bg-blue-600 text-white shadow-sm transition"
                            title="Publish to Flipkart"
                          >
                            Publish
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Publish Results Modal (Matching Section 9) */}
      {bulkModalOpen && bulkSummary && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Bulk Publishing Results
                </h3>
                <p className="text-xs text-slate-500">
                  {bulkSummary.totalSelected} products processed in rate-limited queue
                </p>
              </div>
              <button
                onClick={() => setBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Counts Box */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  ✓ Published
                </div>
                <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                  {bulkSummary.publishedCount}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  ⚠ Pending QC
                </div>
                <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
                  {bulkSummary.pendingCount}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                <div className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                  ✕ Failed
                </div>
                <div className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">
                  {bulkSummary.failedCount}
                </div>
              </div>
            </div>

            {/* Itemized List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 pb-1">
                <span>Detailed Item Breakdown</span>
                {bulkSummary.failedCount > 0 && (
                  <button
                    onClick={() => setBulkErrorFilter(!bulkErrorFilter)}
                    className="text-rose-600 underline font-semibold"
                  >
                    {bulkErrorFilter ? "Show All Items" : "View Failed Products Only"}
                  </button>
                )}
              </div>

              {bulkSummary.results
                .filter((item) => (bulkErrorFilter ? item.status === "FAILED" : true))
                .map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-xs"
                  >
                    <div className="truncate max-w-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {item.sku}
                      </span>
                      <span className="text-slate-500 ml-2 truncate">{item.name}</span>
                      {item.error && (
                        <div className="text-[11px] text-rose-600 mt-0.5">{item.error}</div>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        item.status === "PUBLISHED"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : item.status === "PENDING"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setBulkModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#2874f0] text-white hover:bg-blue-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
