"use client";

import { useState } from "react";
import { EXPLORER_URL, TOKEN_LABELS, TOKENS } from "@/lib/constants";

type TransferResult = {
  hash: string;
  from: string;
  to: string;
  amount: string;
  settlementMs: number;
};

export default function Home() {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [token, setToken] = useState(TOKENS.pathUSD);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TransferResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendTransfer() {
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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
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

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10 space-y-6">
        {/* Send form */}
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
              Memo{" "}
              <span className="text-zinc-400 font-normal">(reconciliation reference)</span>
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
            onClick={sendTransfer}
            disabled={loading || !to || !amount}
            className="w-full rounded-lg bg-zinc-900 text-white py-2.5 text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Sending…" : "Send Payout"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Result */}
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
              <Row
                label="Settlement"
                value={`${(result.settlementMs / 1000).toFixed(2)}s`}
                highlight
              />
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

        {/* Context note */}
        <p className="text-xs text-zinc-400 text-center">
          Operator wallet sponsors all gas fees · Recipients receive stablecoins with zero native token required
        </p>
      </main>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-zinc-500">{label}</span>
      <span
        className={`${mono ? "font-mono text-xs" : ""} ${highlight ? "text-emerald-600 font-semibold" : "text-zinc-900"} truncate max-w-xs`}
      >
        {value}
      </span>
    </div>
  );
}
