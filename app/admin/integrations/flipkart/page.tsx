"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
  Sliders,
  Power,
  Server,
  Info,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface IntegrationState {
  isConnected: boolean;
  sellerId: string;
  sellerName: string;
  email: string;
  apiStatus: string;
  lastSyncAt: string | null;
  lastHealthCheckAt: string | null;
  environment: "sandbox" | "production";
  isDryRun: boolean;
  autoListing: boolean;
  publishingMode: "MANUAL_APPROVAL" | "AUTOMATIC";
  autoInventorySync: boolean;
  autoPriceSync: boolean;
  aiListingGeneration: boolean;
  retryFailedListings: boolean;
}

export default function FlipkartIntegrationPage() {
  const [data, setData] = useState<IntegrationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchIntegration = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/flipkart/status");
      const json = await res.json();
      if (json.success) {
        setData(json.integration);
      }
    } catch (e) {
      console.error("Failed to load status:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegration();
  }, []);

  const handleConnect = async (useSandboxDemo = false) => {
    setConnecting(true);
    setStatusMsg(null);
    try {
      if (useSandboxDemo) {
        // Quick connect for test/sandbox
        window.location.href = "/api/flipkart/connect?mock=true";
        return;
      }

      const res = await fetch("/api/flipkart/connect");
      const json = await res.json();
      if (json.success && json.authUrl) {
        window.location.href = json.authUrl;
      } else {
        setStatusMsg({
          text: json.error || "Please configure FLIPKART_CLIENT_ID and FLIPKART_CLIENT_SECRET or use Test Sandbox.",
          type: "error",
        });
      }
    } catch {
      setStatusMsg({ text: "Failed to initiate OAuth flow", type: "error" });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Flipkart? Active listings will not be deleted, but automated sync will stop.")) {
      return;
    }
    try {
      const res = await fetch("/api/flipkart/disconnect", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setStatusMsg({ text: "Flipkart account disconnected successfully.", type: "success" });
        await fetchIntegration();
      }
    } catch {
      setStatusMsg({ text: "Failed to disconnect", type: "error" });
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/flipkart/test-connection", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setStatusMsg({
          text: `✓ Connection Healthy! Latency: ${json.health?.latencyMs}ms (${json.health?.message})`,
          type: "success",
        });
        await fetchIntegration();
      } else {
        setStatusMsg({
          text: `✕ Test failed: ${json.error}`,
          type: "error",
        });
      }
    } catch {
      setStatusMsg({ text: "Network error during connection test", type: "error" });
    } finally {
      setTesting(false);
    }
  };

  const updateSetting = async (field: keyof IntegrationState, value: any) => {
    if (!data) return;
    const updated = { ...data, [field]: value };
    setData(updated);
    setSaving(true);
    try {
      await fetch("/api/flipkart/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      setStatusMsg({ text: "Settings saved successfully", type: "success" });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch {
      setStatusMsg({ text: "Failed to update setting", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-8 animate-in fade-in duration-300">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Admin Settings
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="text-xs font-bold uppercase tracking-wider text-[#2874f0]">
            Marketplace Integrations
          </span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Flipkart Seller Integration
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Official OAuth 2.0 authorization, automated catalog publishing, and real-time inventory synchronization.
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between border ${
            statusMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-xs font-bold uppercase underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Connection Card (Matching Section 1 Requirement) */}
      <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#2874f0] flex items-center justify-center font-black text-white text-2xl shadow-lg shadow-blue-500/25">
              FK
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Flipkart Seller Hub
                </h2>
                {data?.isConnected ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Connected
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400">
                    Status: Not Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Official Marketplace API v3 • Seller ID: {data?.sellerId || "-"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {data?.isConnected ? (
              <>
                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition"
                >
                  <RefreshCw className={`w-4 h-4 ${testing ? "animate-spin text-[#2874f0]" : ""}`} />
                  <span>{testing ? "Testing..." : "Test Connection"}</span>
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 transition"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleConnect(false)}
                  disabled={connecting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-[#2874f0] hover:bg-blue-600 text-white shadow-md shadow-blue-500/25 transition"
                >
                  <Power className="w-4 h-4" />
                  <span>{connecting ? "Connecting..." : "Connect Flipkart"}</span>
                </button>
                <button
                  onClick={() => handleConnect(true)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                  title="Connect instantly to Sandbox test credentials"
                >
                  Connect Sandbox Test
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status Metrics Block */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          <div>
            <span className="text-xs text-slate-400 font-medium">Seller Account</span>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
              {data?.isConnected ? (data.sellerName || "Connected") : "Not Connected"}
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400 font-medium">API Status</span>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
              {data?.isConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>{data.apiStatus || "Healthy"}</span>
                </>
              ) : (
                "-"
              )}
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400 font-medium">Last Sync</span>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
              {data?.lastSyncAt ? formatRelativeTime(data.lastSyncAt) : "-"}
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400 font-medium">Security</span>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Encrypted Vault</span>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Settings & Policies */}
      <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#2874f0]" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Automation & Publishing Controls
            </h2>
          </div>
          {saving && <span className="text-xs text-blue-500 font-medium animate-pulse">Saving...</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Environment Mode (Section 21) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Environment Mode</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dry Run simulates payloads safely. Production publishes to live Flipkart.
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="radio"
                  name="isDryRun"
                  checked={data?.isDryRun === true}
                  onChange={() => updateSetting("isDryRun", true)}
                  className="text-[#2874f0] focus:ring-blue-500"
                />
                <span>Test / Dry Run Mode (Safe)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="radio"
                  name="isDryRun"
                  checked={data?.isDryRun === false}
                  onChange={() => updateSetting("isDryRun", false)}
                  className="text-[#2874f0] focus:ring-blue-500"
                />
                <span>Production (Live Marketplace)</span>
              </label>
            </div>
          </div>

          {/* Publishing Mode (Section 8) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Publishing Mode</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Require manual administrator review or publish immediately upon validation.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="radio"
                  name="publishingMode"
                  checked={data?.publishingMode === "MANUAL_APPROVAL"}
                  onChange={() => updateSetting("publishingMode", "MANUAL_APPROVAL")}
                  className="text-[#2874f0]"
                />
                <span>Manual Approval (Recommended)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="radio"
                  name="publishingMode"
                  checked={data?.publishingMode === "AUTOMATIC"}
                  onChange={() => updateSetting("publishingMode", "AUTOMATIC")}
                  className="text-[#2874f0]"
                />
                <span>Automatic Publishing</span>
              </label>
            </div>
          </div>

          {/* Automatic Flipkart Listing (Section 7) */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Automatic Flipkart Listing
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically generate AI listing when new products are added.
              </p>
            </div>
            <button
              onClick={() => updateSetting("autoListing", !data?.autoListing)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                data?.autoListing ? "bg-[#2874f0]" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  data?.autoListing ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Auto Inventory Synchronization (Section 10) */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Auto Inventory Sync
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Instantly push warehouse stock adjustments to Flipkart.
              </p>
            </div>
            <button
              onClick={() => updateSetting("autoInventorySync", !data?.autoInventorySync)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                data?.autoInventorySync ? "bg-[#2874f0]" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  data?.autoInventorySync ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Auto Price Synchronization */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Auto Price Sync
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically sync MRP and selling price changes.
              </p>
            </div>
            <button
              onClick={() => updateSetting("autoPriceSync", !data?.autoPriceSync)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                data?.autoPriceSync ? "bg-[#2874f0]" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  data?.autoPriceSync ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Retry Failed Listings */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Retry Failed Listings
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically retry transient failures with exponential backoff.
              </p>
            </div>
            <button
              onClick={() => updateSetting("retryFailedListings", !data?.retryFailedListings)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                data?.retryFailedListings ? "bg-[#2874f0]" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  data?.retryFailedListings ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
