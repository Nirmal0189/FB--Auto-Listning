"use client";

import React, { useState, useEffect } from "react";
import {
  History,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Code,
  X,
  ShieldCheck,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface LogEntry {
  _id: string;
  timestamp: string;
  productName?: string;
  sku?: string;
  operation: string;
  apiStatus: string;
  result: "SUCCESS" | "WARNING" | "FAILED";
  error?: string;
  user: string;
  durationMs: number;
  flipkartListingId?: string;
  isDryRun: boolean;
  details?: Record<string, unknown>;
}

export default function FlipkartLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [operationFilter, setOperationFilter] = useState("ALL");
  const [resultFilter, setResultFilter] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (operationFilter !== "ALL") params.append("operation", operationFilter);
      if (resultFilter !== "ALL") params.append("result", resultFilter);

      const res = await fetch(`/api/flipkart/logs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Failed to load logs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [operationFilter, resultFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Flipkart Integration
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#2874f0]">
              Audit Trail
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Flipkart Activity & Security Logs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Detailed immutable audit trail of API calls, OAuth token events, AI listings, and sync transactions. All sensitive credentials are automatically redacted.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU, Product, or Listing ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={operationFilter}
            onChange={(e) => setOperationFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Operations</option>
            <option value="CREATE_LISTING">CREATE LISTING</option>
            <option value="UPDATE_LISTING">UPDATE LISTING</option>
            <option value="UPDATE_INVENTORY">UPDATE INVENTORY</option>
            <option value="UPDATE_PRICE">UPDATE PRICE</option>
            <option value="AI_GENERATE">AI GENERATE</option>
            <option value="VALIDATE">VALIDATE</option>
            <option value="HEALTH_CHECK">HEALTH CHECK</option>
          </select>

          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Results</option>
            <option value="SUCCESS">Success</option>
            <option value="WARNING">Warning</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Operation</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4">Listing ID</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No log entries found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {log.productName || log.sku || "System Event"}
                      </div>
                      {log.sku && (
                        <div className="text-[10px] font-mono text-slate-400">{log.sku}</div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {log.operation}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.result === "SUCCESS"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : log.result === "WARNING"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        }`}
                      >
                        {log.result}
                      </span>
                      {log.error && (
                        <div className="text-[10px] text-rose-600 line-clamp-1 mt-0.5 font-medium">
                          {log.error}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {log.flipkartListingId || "-"}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-500">
                      {log.durationMs ? `${(log.durationMs / 1000).toFixed(2)}s` : "-"}
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {log.user || "System"}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {log.details ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
                          title="Inspect Payload"
                        >
                          <Code className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Audit Event Payload Details
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {selectedLog.operation} • {selectedLog.sku || "N/A"} • {formatDate(selectedLog.timestamp)}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 max-h-80 overflow-y-auto">
              <pre className="text-[11px] font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Secrets & OAuth tokens redacted</span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
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
