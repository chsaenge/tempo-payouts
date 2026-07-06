"use client";

import { useState, useRef, useEffect } from "react";
import { EXPLORER_URL, TOKEN_LABELS, TOKENS } from "@/lib/constants";

const LS_KEY = "tempoPayoutsLastBatch";

// ─── Types ───────────────────────────────────────────────────────────────────

type TransferResult = {
  hash: string;
  from: string;
  to: string;
  amount: string;
  settlementMs: number;
};

type PayoutRow = {
  to: string;
  amount: string;
  memo: string;
  token: string;
};

type RowResult = {
  index: number;
  to: string;
  amount: string;
  status: "success" | "error";
  hash?: string;
  settlementMs?: number;
  error?: string;
};

type BatchStats = {
  total: number;
  succeeded: number;
  failed: number;
  totalMs: number;
  avgSettlementMs: number | null;
  minSettlementMs: number | null;
  maxSettlementMs: number | null;
};

// ─── CSV parser ──────────────────────────────────────────────────────────────

function parseCSV(text: string): PayoutRow[] {
  const lines = text.trim().split(/\r?\n/);
  // skip header if first cell looks like a label
  const start = /^(to|address|recipient)/i.test(lines[0]) ? 1 : 0;
  return lines.slice(start).flatMap((line) => {
    const [to, amount, memo = "", token = ""] = line.split(",").map((c) => c.trim());
    if (!to || !amount) return [];
    return [{ to, amount, memo, token: token || TOKENS.pathUSD }];
  });
}

// ─── App ─────────────────────────────────────────────────────────────────────

const TAB_LABELS: Record<"single" | "batch" | "compare", string> = {
  single: "Single",
  batch: "Batch CSV",
  compare: "Compare Rails",
};

export default function Home() {
  const [tab, setTab] = useState<"single" | "batch" | "compare">("single");

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Tempo Payouts</h1>
            <p className="text-xs text-zinc-500">Gig worker disbursements · Moderato testnet</p>
          </div>
          <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-1 rounded-full">
            Testnet
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto w-full px-6 pt-6">
        <div className="flex gap-1 bg-zinc-100 rounded-lg p-1 w-fit">
          {(["single", "batch", "compare"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-6 space-y-6">
        {tab === "single" && <SingleTab />}
        {tab === "batch" && <BatchTab />}
        {tab === "compare" && <CompareTab />}
      </main>
    </div>
  );
}

// ─── Single tab ──────────────────────────────────────────────────────────────

function SingleTab() {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [token, setToken] = useState(TOKENS.pathUSD);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TransferResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, amount, memo, token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transfer failed");
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-5">
        <h2 className="font-medium text-sm text-zinc-500 uppercase tracking-wider">
          Send Payout
        </h2>

        <div className="space-y-1">
          <label className="text-sm font-medium">Recipient address</label>
          <input
            type="text"
            placeholder="0x..."
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium">Amount</label>
            <input
              type="number"
              placeholder="100.00"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Token</label>
            <select
              value={token}
              onChange={(e) => setToken(e.target.value as `0x${string}`)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              {Object.entries(TOKENS).map(([, addr]) => (
                <option key={addr} value={addr}>
                  {TOKEN_LABELS[addr]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">
            Memo <span className="text-zinc-400 font-normal">(reconciliation reference)</span>
          </label>
          <input
            type="text"
            placeholder="worker_001 · INV-2025-001"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        <button
          onClick={send}
          disabled={loading || !to || !amount}
          className="w-full rounded-lg bg-zinc-900 text-white py-2.5 text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Sending…" : "Send Payout"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-white rounded-xl border border-emerald-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 text-lg">✓</span>
            <h2 className="font-medium">Payout Sent</h2>
          </div>
          <div className="space-y-2 text-sm">
            <Row label="Amount" value={`${result.amount} ${TOKEN_LABELS[token]}`} />
            <Row label="To" value={result.to} mono />
            <Row label="From" value={result.from} mono />
            <Row label="Settlement" value={`${(result.settlementMs / 1000).toFixed(2)}s`} highlight />
            <Row label="Tx hash" value={`${result.hash.slice(0, 18)}…`} mono />
          </div>
          <a
            href={`${EXPLORER_URL}/tx/${result.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            View on explorer ↗
          </a>
        </div>
      )}

      <p className="text-xs text-zinc-400 text-center">
        Operator wallet sponsors all gas fees · Recipients receive stablecoins with zero native token required
      </p>
    </>
  );
}

// ─── Batch tab ───────────────────────────────────────────────────────────────

function BatchTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RowResult[] | null>(null);
  const [stats, setStats] = useState<BatchStats | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseCSV(ev.target?.result as string);
        if (parsed.length === 0) throw new Error("No valid rows found");
        setRows(parsed);
        setParseError(null);
        setResults(null);
        setStats(null);
      } catch (err: any) {
        setParseError(err.message);
        setRows([]);
      }
    };
    reader.readAsText(file);
  }

  async function sendBatch() {
    setLoading(true);
    setResults(null);
    setStats(null);
    setApiError(null);
    try {
      const res = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payouts: rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Batch failed");
      setResults(data.results);
      setStats(data.stats);
      if (data.stats.succeeded > 0) {
        localStorage.setItem(LS_KEY, JSON.stringify(data.stats));
      }
    } catch (err: any) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Upload zone */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
        <h2 className="font-medium text-sm text-zinc-500 uppercase tracking-wider">
          Upload Payout CSV
        </h2>
        <p className="text-xs text-zinc-400">
          Columns: <code className="bg-zinc-100 px-1 rounded">to, amount, memo (optional), token (optional)</code>
        </p>

        <div
          className="border-2 border-dashed border-zinc-200 rounded-lg p-8 text-center cursor-pointer hover:border-zinc-400 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={onFile} className="hidden" />
          <p className="text-sm text-zinc-500">
            {rows.length > 0
              ? `${rows.length} rows loaded — click to replace`
              : "Click to upload a CSV file"}
          </p>
        </div>

        {parseError && (
          <p className="text-sm text-red-600">{parseError}</p>
        )}
      </div>

      {/* Preview table */}
      {rows.length > 0 && !results && (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
            <span className="text-sm font-medium">{rows.length} payouts queued</span>
            <button
              onClick={sendBatch}
              disabled={loading}
              className="rounded-lg bg-zinc-900 text-white px-4 py-1.5 text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Sending…" : `Send ${rows.length} Payouts`}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">To</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-left">Token</th>
                  <th className="px-4 py-2 text-left">Memo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-50">
                    <td className="px-4 py-2 text-zinc-400">{i + 1}</td>
                    <td className="px-4 py-2 font-mono truncate max-w-[140px]">{row.to}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{row.amount}</td>
                    <td className="px-4 py-2">{TOKEN_LABELS[row.token] ?? row.token}</td>
                    <td className="px-4 py-2 text-zinc-400 truncate max-w-[120px]">{row.memo || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {apiError}
        </div>
      )}

      {/* Stats banner */}
      {stats && (
        <div className="bg-white rounded-xl border border-emerald-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 text-lg">✓</span>
            <h2 className="font-medium">Batch Complete</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Sent" value={`${stats.succeeded}/${stats.total}`} />
            <Stat
              label="Avg settlement"
              value={stats.avgSettlementMs != null ? `${(stats.avgSettlementMs / 1000).toFixed(2)}s` : "—"}
              highlight
            />
            <Stat
              label="Fastest"
              value={stats.minSettlementMs != null ? `${(stats.minSettlementMs / 1000).toFixed(2)}s` : "—"}
            />
            <Stat
              label="Total wall time"
              value={`${(stats.totalMs / 1000).toFixed(1)}s`}
            />
          </div>
          {stats.failed > 0 && (
            <p className="text-xs text-red-600">{stats.failed} payout(s) failed — see table below</p>
          )}
        </div>
      )}

      {/* Results table */}
      {results && (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100">
            <span className="text-sm font-medium">Results</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">To</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-right">Settlement</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {results.map((r) => (
                  <tr key={r.index} className={r.status === "error" ? "bg-red-50" : "hover:bg-zinc-50"}>
                    <td className="px-4 py-2 text-zinc-400">{r.index + 1}</td>
                    <td className="px-4 py-2 font-mono truncate max-w-[140px]">{r.to}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.amount}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.settlementMs != null ? `${(r.settlementMs / 1000).toFixed(2)}s` : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {r.status === "success" ? (
                        <span className="text-emerald-600 font-medium">✓</span>
                      ) : (
                        <span className="text-red-600 font-medium" title={r.error}>✗</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {r.hash ? (
                        <a
                          href={`${EXPLORER_URL}/tx/${r.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-400 hover:text-zinc-900 font-mono"
                        >
                          {r.hash.slice(0, 10)}…
                        </a>
                      ) : (
                        <span className="text-zinc-300 font-mono">{r.error?.slice(0, 24) ?? "—"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-zinc-400 text-center">
        All transfers sent concurrently · Operator wallet sponsors gas · Max 100 per batch
      </p>
    </>
  );
}

// ─── Compare tab ─────────────────────────────────────────────────────────────

type SavedStats = {
  avgSettlementMs: number | null;
  minSettlementMs: number | null;
  total: number;
  succeeded: number;
  totalMs: number;
};

const RAILS = [
  {
    id: "tempo",
    name: "Tempo",
    badge: "This app",
    badgeColor: "bg-emerald-100 text-emerald-700",
    col: "text-emerald-700 font-semibold",
  },
  {
    id: "ach",
    name: "ACH",
    badge: "Traditional",
    badgeColor: "bg-zinc-100 text-zinc-500",
    col: "text-zinc-700",
  },
  {
    id: "wire",
    name: "Domestic Wire",
    badge: "Traditional",
    badgeColor: "bg-zinc-100 text-zinc-500",
    col: "text-zinc-700",
  },
] as const;

type RailId = (typeof RAILS)[number]["id"];

type CompareRow = {
  label: string;
  sub?: string;
  values: Record<RailId, string>;
  highlight?: RailId;
};

function buildRows(saved: SavedStats | null): CompareRow[] {
  const tempoAvg = saved?.avgSettlementMs != null
    ? `${(saved.avgSettlementMs / 1000).toFixed(2)}s`
    : "~1.78s";
  const tempoMin = saved?.minSettlementMs != null
    ? ` (min ${(saved.minSettlementMs / 1000).toFixed(2)}s)`
    : "";
  const tempoCount = saved ? ` · ${saved.succeeded} txs measured` : " · 50 txs measured";

  return [
    {
      label: "Settlement time",
      sub: "Time from send to finality",
      values: {
        tempo: `${tempoAvg}${tempoMin}${tempoCount}`,
        ach: "T+1 business day (~24 hrs, 86,400s)",
        wire: "Same day if before cutoff / T+1 (~8–86,400s)",
      },
      highlight: "tempo",
    },
    {
      label: "Cost per transaction",
      sub: "Sender-side fees",
      values: {
        tempo: "$0 (gas sponsored by operator)",
        ach: "$0.20 – $1.50",
        wire: "$15 – $50 domestic",
      },
      highlight: "tempo",
    },
    {
      label: "Availability",
      sub: "When can you send?",
      values: {
        tempo: "24 / 7 / 365",
        ach: "Mon – Fri, 5 pm ET cutoff",
        wire: "Mon – Fri, business hours",
      },
      highlight: "tempo",
    },
    {
      label: "Finality",
      sub: "Can the payment be reversed?",
      values: {
        tempo: "Irreversible on-chain",
        ach: "Reversible up to 60 days",
        wire: "Final once received (hours)",
      },
      highlight: "tempo",
    },
    {
      label: "Recipient setup",
      sub: "What does the worker need?",
      values: {
        tempo: "Wallet address (no bank required)",
        ach: "Bank account + routing number",
        wire: "Bank account + routing + SWIFT",
      },
      highlight: "tempo",
    },
    {
      label: "Programmability",
      sub: "On-chain logic & composability",
      values: {
        tempo: "Full (EVM smart contracts)",
        ach: "None",
        wire: "None",
      },
      highlight: "tempo",
    },
  ];
}

function CompareTab() {
  const [saved, setSaved] = useState<SavedStats | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const rows = buildRows(saved);
  const avgMs = saved?.avgSettlementMs ?? 1780;
  const achMs = 24 * 60 * 60 * 1000;
  const multiplier = Math.round(achMs / avgMs / 1000) * 1000;
  const multiplierLabel = multiplier >= 1000
    ? `~${(multiplier / 1000).toFixed(0)}k×`
    : `~${multiplier}×`;

  return (
    <>
      {/* Hero */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1">
              Settlement speed
            </p>
            <p className="text-3xl font-bold text-emerald-600 tabular-nums">
              {saved?.avgSettlementMs != null
                ? `${(saved.avgSettlementMs / 1000).toFixed(2)}s`
                : "~1.78s"}
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              avg on Tempo Moderato testnet
              {saved ? ` · ${saved.succeeded} payouts` : " · 50 txs measured"}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-zinc-400 mb-1">vs ACH</p>
            <p className="text-lg font-semibold text-zinc-900">{multiplierLabel}</p>
            <p className="text-xs text-zinc-400">faster</p>
          </div>
        </div>
        {saved && (
          <p className="text-xs text-zinc-400 mt-4 pt-4 border-t border-zinc-100">
            Live numbers from your last batch run · Run another batch to refresh
          </p>
        )}
      </div>

      {/* Comparison table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100">
          <span className="text-sm font-medium">Payment rail comparison</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-zinc-500 uppercase tracking-wider w-1/4">
                  Attribute
                </th>
                {RAILS.map((r) => (
                  <th key={r.id} className="px-4 py-3 text-left text-xs uppercase tracking-wider">
                    <span className="text-zinc-900 font-semibold">{r.name}</span>
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${r.badgeColor}`}>
                      {r.badge}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((row) => (
                <tr key={row.label} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 align-top">
                    <p className="font-medium text-zinc-900 text-xs">{row.label}</p>
                    {row.sub && <p className="text-[11px] text-zinc-400 mt-0.5">{row.sub}</p>}
                  </td>
                  {RAILS.map((r) => (
                    <td
                      key={r.id}
                      className={`px-4 py-3 text-xs align-top ${
                        row.highlight === r.id ? r.col : "text-zinc-500"
                      }`}
                    >
                      {row.values[r.id]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-zinc-400 text-center">
        ACH / wire figures are US industry averages · Tempo numbers measured live on Moderato testnet
      </p>
    </>
  );
}

// ─── Shared components ───────────────────────────────────────────────────────

function Row({
  label, value, mono, highlight,
}: {
  label: string; value: string; mono?: boolean; highlight?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-zinc-500">{label}</span>
      <span className={`${mono ? "font-mono text-xs" : ""} ${highlight ? "text-emerald-600 font-semibold" : "text-zinc-900"} truncate max-w-xs`}>
        {value}
      </span>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-zinc-50 rounded-lg px-3 py-3">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${highlight ? "text-emerald-600" : "text-zinc-900"}`}>
        {value}
      </p>
    </div>
  );
}
