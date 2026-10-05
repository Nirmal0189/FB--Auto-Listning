"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileQuestion,
  TrendingUp,
  RefreshCw,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  ShoppingBag,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface DashboardData {
  isConnected: boolean;
  sellerId: string;
  sellerName: string;
  apiStatus: string;
  lastSyncAt: string | null;
  isDryRun: boolean;
  autoListing: boolean;
  publishingMode: string;
  stats: {
    totalProducts: number;
    liveCount: number;
    pendingCount: number;
    failedCount: number;
    notListedCount: number;
    publishedToday: number;
    inventorySyncedToday: number;
    priceUpdatesToday: number;
    failedApiRequestsToday: number;
  };
}

interface RecentLog {
  _id: string;
  operation: string;
  productName: string;
  sku: string;
  result: "SUCCESS" | "WARNING" | "FAILED";
  timestamp: string;
  durationMs: number;
  flipkartListingId?: string;
}

export default function FlipkartDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [statusRes, logsRes] = await Promise.all([
        fetch("/api/flipkart/status"),
        fetch("/api/flipkart/logs?limit=5"),
      ]);

      const statusJson = await statusRes.json();
      const logsJson = await logsRes.json();

      if (statusJson.success) setData(statusJson.integration);
      if (logsJson.success) setRecentLogs(logsJson.logs || []);
    } catch (e) {
      console.error("Failed to load dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await fetch("/api/flipkart/sync", { method: "POST" });
      await fetchDashboard();
    } finally {
      setSyncing(false);
    }
  };

  const stats = data?.stats || {
    totalProducts: 0,
    liveCount: 0,
    pendingCount: 0,
    failedCount: 0,
    notListedCount: 0,
    publishedToday: 0,
    inventorySyncedToday: 0,
    priceUpdatesToday: 0,
    failedApiRequestsToday: 0,
  };

  const total = stats.totalProducts || 1;
  const livePct = Math.round((stats.liveCount / total) * 100);
  const pendingPct = Math.round((stats.pendingCount / total) * 100);
  const failedPct = Math.round((stats.failedCount / total) * 100);
  const notListedPct = Math.max(0, 100 - livePct - pendingPct - failedPct);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome & Quick Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#2874f0]/10 text-[#2874f0] border border-[#2874f0]/20">
              Flipkart Marketplace Engine
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded font-semibold ${data?.isDryRun
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                }`}
            >
              {data?.isDryRun ? "Test / Dry Run Mode" : "Production Mode"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Flipkart Listing Control Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            FP AUTO Pvt. Ltd. • Automated AI catalog synchronization & official Flipkart Marketplace integration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin text-[#2874f0]" : ""}`} />
            <span>{syncing ? "Syncing..." : "Sync All"}</span>
          </button>

          <Link
            href="/admin/flipkart/products"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#2874f0] hover:bg-blue-600 text-white shadow-md shadow-blue-500/20 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Bulk Auto-List</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Cards (5 Pillars) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Products */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Total Products</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#2874f0]">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {stats.totalProducts}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span>In Catalog</span>
          </div>
        </div>

        {/* Live Listings */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-950/60 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Live Listings
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.liveCount}
          </div>
          <div className="text-xs text-emerald-600/80 font-medium mt-1">
            {livePct}% of total catalog
          </div>
        </div>

        {/* Pending Listings */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-950/60 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Pending QC
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
            {stats.pendingCount}
          </div>
          <div className="text-xs text-amber-600/80 font-medium mt-1">
            Under QC Review
          </div>
        </div>

        {/* Failed Listings */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-950/60 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Failed
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-600 dark:text-rose-400">
            {stats.failedCount}
          </div>
          <div className="text-xs text-rose-600/80 font-medium mt-1">
            Requires Attention
          </div>
        </div>

        {/* Not Listed */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Not Listed</span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600">
              <FileQuestion className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-700 dark:text-slate-300">
            {stats.notListedCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Ready for AI draft
          </div>
        </div>
      </div>

      {/* Secondary Operational Metrics (Today's Sync & Performance) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.publishedToday}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Listings Published Today
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.inventorySyncedToday}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Inventory Synced Today
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.priceUpdatesToday}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Price Updates Today
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.failedApiRequestsToday}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Failed API Requests
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Bar & Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Catalog Listing Status Breakdown
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Proportion of active products successfully pushed to Flipkart
              </p>
            </div>
            <Link
              href="/admin/flipkart/products"
              className="text-xs font-semibold text-[#2874f0] hover:underline flex items-center gap-1"
            >
              <span>View Table</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Progress Stack Bar */}
          <div className="w-full h-5 rounded-xl bg-slate-100 dark:bg-slate-800 flex overflow-hidden p-1 gap-1">
            <div
              style={{ width: `${livePct}%` }}
              className="h-full rounded-lg bg-emerald-500 transition-all duration-500"
              title={`Live: ${livePct}%`}
            />
            <div
              style={{ width: `${pendingPct}%` }}
              className="h-full rounded-lg bg-amber-500 transition-all duration-500"
              title={`Pending: ${pendingPct}%`}
            />
            <div
              style={{ width: `${failedPct}%` }}
              className="h-full rounded-lg bg-rose-500 transition-all duration-500"
              title={`Failed: ${failedPct}%`}
            />
            <div
              style={{ width: `${notListedPct}%` }}
              className="h-full rounded-lg bg-slate-300 dark:bg-slate-700 transition-all duration-500"
              title={`Not Listed: ${notListedPct}%`}
            />
          </div>

          {/* Legend Items */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Live</span>
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {stats.liveCount} ({livePct}%)
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Pending</span>
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {stats.pendingCount} ({pendingPct}%)
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Failed</span>
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {stats.failedCount} ({failedPct}%)
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Not Listed</span>
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {stats.notListedCount} ({notListedPct}%)
              </div>
            </div>
          </div>
        </div>

        {/* Integration Status & Health Summary */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Flipkart Health</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Official API Active
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Seller ID:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {data?.sellerId || "PARTH_PLASTO_01"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Last Sync:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatRelativeTime(data?.lastSyncAt)}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Auto-Listing Mode:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {data?.autoListing ? "Enabled (Auto)" : "Manual Approval"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">Security / Vault:</span>
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  AES-256-GCM
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            <Link
              href="/admin/integrations/flipkart"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
            >
              Configure Flipkart Integration
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity Log Stream */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Flipkart Operations
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live audit stream of API transactions, validations, and AI generations
            </p>
          </div>
          <Link
            href="/admin/flipkart/logs"
            className="text-xs font-semibold text-[#2874f0] hover:underline"
          >
            View Full Audit Log
          </Link>
        </div>

        {recentLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No recent activity recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Time</th>
                  <th className="px-4 py-3">Operation</th>
                  <th className="px-4 py-3">Product / SKU</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 rounded-r-lg">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-500">
                      {formatRelativeTime(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      {log.operation}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-xs">
                        {log.productName || log.sku}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.sku}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${log.result === "SUCCESS"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : log.result === "WARNING"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                      >
                        {log.result}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {log.durationMs}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
