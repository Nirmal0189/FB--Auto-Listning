"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Settings,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Sliders,
  ExternalLink,
  Save,
  AlertCircle,
} from "lucide-react";

interface SettingsData {
  isDryRun: boolean;
  autoListing: boolean;
  publishingMode: "MANUAL_APPROVAL" | "AUTOMATIC";
  autoInventorySync: boolean;
  autoPriceSync: boolean;
  aiListingGeneration: boolean;
  retryFailedListings: boolean;
  environment: "sandbox" | "production";
}

export default function FlipkartSettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/flipkart/settings");
      const json = await res.json();
      if (json.success) {
        setSettings(json.settings);
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch("/api/flipkart/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ text: "Flipkart integration settings successfully saved!", type: "success" });
      } else {
        setToast({ text: `Failed to save: ${data.error}`, type: "error" });
      }
    } catch {
      setToast({ text: "Network error saving settings", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-[#2874f0]" />
        <span className="text-sm font-semibold">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-300">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Settings</span>
          <span className="text-slate-300">•</span>
          <span className="text-xs font-bold uppercase tracking-wider text-[#2874f0]">
            Flipkart Marketplace
          </span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Flipkart Engine Configuration
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure background synchronization, AI listing policies, publishing approval gates, and environment modes.
        </p>
      </div>

      {toast && (
        <div
          className={`p-4 rounded-xl text-sm border flex items-center justify-between ${toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
            }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-xs font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Settings Card (Section 20 Matching) */}
      <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Automation & Policy Settings
            </h2>
            <p className="text-xs text-slate-500">
              Manage how FP AUTO products interact with Flipkart
            </p>
          </div>
          <Link
            href="/admin/integrations/flipkart"
            className="flex items-center gap-1.5 text-xs font-semibold text-[#2874f0] hover:underline"
          >
            <span>OAuth & Connection</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-4">
          {/* Automatic Listing */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                Automatic Listing
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Automatically generate Flipkart listings when new products are added.
              </div>
            </div>
            <button
              onClick={() => setSettings({ ...settings, autoListing: !settings.autoListing })}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.autoListing ? "bg-[#2874f0]" : "bg-slate-300 dark:bg-slate-700"
                }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.autoListing ? "translate-x-6" : "translate-x-0"
                  }`}
              />
            </button>
          </div>

          {/* AI Generation */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                AI Generation
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Enable smart SEO title and highlight generation adhering to safety constraints.
              </div>
            </div>
            <button
              onClick={() => setSettings({ ...settings, aiListingGeneration: !settings.aiListingGeneration })}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.aiListingGeneration ? "bg-[#2874f0]" : "bg-slate-300 dark:bg-slate-700"
                }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.aiListingGeneration ? "translate-x-6" : "translate-x-0"
                  }`}
              />
            </button>
          </div>

          {/* Auto Inventory Sync */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                Inventory Sync
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Push warehouse stock updates to Flipkart in real time and via cron.
              </div>
            </div>
            <button
              onClick={() => setSettings({ ...settings, autoInventorySync: !settings.autoInventorySync })}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.autoInventorySync ? "bg-[#2874f0]" : "bg-slate-300 dark:bg-slate-700"
                }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.autoInventorySync ? "translate-x-6" : "translate-x-0"
                  }`}
              />
            </button>
          </div>

          {/* Auto Price Sync */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                Price Sync
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Automatically propagate selling price & MRP revisions to Flipkart.
              </div>
            </div>
            <button
              onClick={() => setSettings({ ...settings, autoPriceSync: !settings.autoPriceSync })}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.autoPriceSync ? "bg-[#2874f0]" : "bg-slate-300 dark:bg-slate-700"
                }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.autoPriceSync ? "translate-x-6" : "translate-x-0"
                  }`}
              />
            </button>
          </div>

          {/* Publishing Mode */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                Publishing Mode
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Current: {settings.publishingMode === "MANUAL_APPROVAL" ? "Manual Approval Required" : "Automatic Publishing Enabled"}
              </div>
            </div>
            <button
              onClick={() =>
                setSettings({
                  ...settings,
                  publishingMode:
                    settings.publishingMode === "MANUAL_APPROVAL" ? "AUTOMATIC" : "MANUAL_APPROVAL",
                })
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${settings.publishingMode === "MANUAL_APPROVAL"
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                  : "bg-emerald-600 text-white"
                }`}
            >
              {settings.publishingMode === "MANUAL_APPROVAL" ? "Manual Mode" : "Auto Mode"}
            </button>
          </div>

          {/* Dry Run Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                Dry Run Simulation Mode
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                When enabled, listings are simulated and validated without calling live marketplace APIs.
              </div>
            </div>
            <button
              onClick={() => setSettings({ ...settings, isDryRun: !settings.isDryRun })}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.isDryRun ? "bg-amber-500" : "bg-emerald-500"
                }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.isDryRun ? "translate-x-6" : "translate-x-0"
                  }`}
              />
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-[#2874f0] hover:bg-blue-600 text-white shadow-md shadow-blue-500/25 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Settings..." : "Save Settings"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
