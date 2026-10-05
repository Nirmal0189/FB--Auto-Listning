"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  ShoppingBag,
  History,
  Settings,
  Link2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface StatusData {
  isConnected: boolean;
  sellerId: string;
  sellerName: string;
  apiStatus: string;
  lastSyncAt: string | null;
  isDryRun: boolean;
  environment: string;
  autoListing: boolean;
  publishingMode: string;
  stats: {
    totalProducts: number;
    liveCount: number;
    pendingCount: number;
    failedCount: number;
  };
}

export default function AdminNavigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/flipkart/status");
      const data = await res.json();
      if (data.success) {
        setStatus(data.integration);
      }
    } catch (e) {
      console.error("Failed to load Flipkart status:", e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const triggerSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/flipkart/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast("✓ Catalog and stock successfully synced with Flipkart!");
        fetchStatus();
      } else {
        showToast(`✕ Sync failed: ${data.error}`);
      }
    } catch {
      showToast("✕ Network error during sync");
    } finally {
      setSyncing(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const navLinks = [
    {
      name: "Flipkart Dashboard",
      href: "/admin/flipkart",
      icon: LayoutDashboard,
    },
    {
      name: "Bulk Auto-Listing",
      href: "/admin/flipkart/products",
      icon: Layers,
      badge: status?.stats?.totalProducts ? String(status.stats.totalProducts) : undefined,
    },
    {
      name: "Product Catalog",
      href: "/admin/products",
      icon: ShoppingBag,
    },
    {
      name: "Activity Logs",
      href: "/admin/flipkart/logs",
      icon: History,
    },
    {
      name: "Flipkart Integration",
      href: "/admin/integrations/flipkart",
      icon: Link2,
      pill: status?.isConnected ? "Connected" : "Disconnected",
    },
    {
      name: "Settings",
      href: "/admin/settings/flipkart",
      icon: Settings,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-5">
          <Zap className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#2874f0] flex items-center justify-center font-bold text-white shadow-sm">
            FK
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              FP AUTO
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">Flipkart Auto-Listing</p>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${mobileMenuOpen ? "block" : "hidden"
          } md:flex flex-col w-full md:w-64 lg:w-72 bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800 shrink-0 md:min-h-screen z-30`}
      >
        {/* Brand Header */}
        <div className="hidden md:flex items-center gap-3 px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2874f0] to-blue-500 flex items-center justify-center font-black text-white text-lg shadow-md shadow-blue-500/20">
            P
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
              FP AUTO
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Flipkart Integration
              </p>
            </div>
          </div>
        </div>

        {/* Live Integration Status Card */}
        <div className="px-4 py-3 mx-4 my-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-slate-500 dark:text-slate-400">Connection</span>
            {status?.isConnected ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-3.5 h-3.5" />
                Not Connected
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
            <span>Mode:</span>
            <span
              className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${status?.isDryRun
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                }`}
            >
              {status?.isDryRun ? "Test / Dry Run" : "Production"}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 mt-1">
            <span>Publishing:</span>
            <span className="font-medium">
              {status?.publishingMode === "AUTOMATIC" ? "Auto" : "Manual Approval"}
            </span>
          </div>
        </div>

        {/* Menu Links */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navLinks.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin/flipkart" && pathname?.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                    ? "bg-[#2874f0] text-white shadow-sm shadow-blue-500/25"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${isActive ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                  >
                    {item.badge}
                  </span>
                )}
                {item.pill && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${item.pill === "Connected"
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                  >
                    {item.pill}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Quick Sync */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={triggerSync}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-[#2874f0]" : ""}`} />
            {syncing ? "Syncing Catalog..." : "Sync Stock & Price"}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Desktop Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white/70 dark:bg-[#0f172a]/70 backdrop-blur border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
              Admin Portal
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              FP AUTO Pvt. Ltd.
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <span className="w-2 h-2 rounded-full bg-[#2874f0]"></span>
              <span className="font-medium text-slate-600 dark:text-slate-300">
                Flipkart Seller API:
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {status?.isConnected ? "Active" : "Ready to Connect"}
              </span>
            </div>

            <Link
              href="/admin/integrations/flipkart"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#2874f0] hover:text-blue-700 dark:hover:text-blue-400"
            >
              <span>Manage Connection</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
