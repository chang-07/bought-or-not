"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  Wallet,
  Bug,
  TrendingUp,
  Activity,
  Target,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import api from "@/lib/api";
import dynamic from "next/dynamic";
import { StatCard } from "@/components/ui/StatCard";

const PortfolioCharts = dynamic(() => import("@/components/PortfolioCharts"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`bg-[#111114] border border-white/5 rounded-[2rem] p-8 h-[360px] animate-pulse ${
            i === 1 ? "lg:col-span-2" : ""
          }`}
        />
      ))}
    </div>
  ),
});

type Position = {
  ticker: string;
  units: number;
  price: number;
  average_purchase_price: number;
  open_pnl: number;
};

type Balance = {
  currency: string;
  cash: number;
};

type AccountDebug = {
  raw_positions_count: number;
  parsed_positions_count: number;
};

type Account = {
  account_id: string;
  account_name: string;
  positions: Position[];
  balances: Balance[];
  debug?: AccountDebug;
};

type PortfolioResponse = {
  success?: boolean;
  error?: string;
  portfolio?: Account[];
};

type PortfolioClientProps = {
  initialPortfolio: PortfolioResponse;
  initialSnapshots: { date: string; value: number }[];
};

export default function PortfolioClient({ initialPortfolio, initialSnapshots }: PortfolioClientProps) {
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const rawPortfolio = Array.isArray(initialPortfolio?.portfolio)
      ? initialPortfolio.portfolio
      : [];

    return rawPortfolio.map((acc: any) => {
      const positions = Array.isArray(acc.positions)
        ? acc.positions.map((p: any) => ({
            ticker: String(p?.ticker || "UNK"),
            units: Number(p?.units || 0),
            price: Number(p?.price || 0),
            average_purchase_price: Number(p?.average_purchase_price || 0),
            open_pnl: Number(p?.open_pnl || 0),
          }))
        : [];

      const balances = Array.isArray(acc.balances)
        ? acc.balances.map((b: any) => ({
            currency: String(b?.currency || ""),
            cash: Number(b?.cash || 0),
          }))
        : [];

      return {
        account_id: String(acc.account_id || ""),
        account_name: String(acc.account_name || "Brokerage Account"),
        positions: positions.filter((p: any) => p.units > 0 && p.ticker !== "UNK"),
        balances,
        debug: acc.debug,
      };
    });
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialPortfolio?.error ? initialPortfolio.error : "");
  const [sellState, setSellState] = useState<{
    symbol: string | null;
    status: "idle" | "loading" | "success" | "error";
  }>({
    symbol: null,
    status: "idle",
  });
  const [manageLoading, setManageLoading] = useState(false);
  const [snapshots, setSnapshots] = useState<{date: string, value: number}[]>(initialSnapshots);

  // Bypassed initial generic fetch due to Next.js SSR

  const totals = useMemo(() => {
    let totalPositions = 0;
    let totalMarketValue = 0;
    let totalCash = 0;
    let totalPnL = 0;

    for (const acc of accounts) {
      for (const p of acc.positions || []) {
        totalPositions += 1;
        totalMarketValue += (Number(p.units) || 0) * (Number(p.price) || 0);
        totalPnL += Number(p.open_pnl) || 0;
      }
      for (const b of acc.balances || []) {
        if ((b.currency || "").toUpperCase() === "USD") {
          totalCash += Number(b.cash) || 0;
        }
      }
    }

    return { totalPositions, totalMarketValue, totalCash, totalPnL };
  }, [accounts]);

  const fetchPortfolio = async () => {
    setLoading(true);
    setError("");
    try {
      const [portRes, histRes] = await Promise.all([
        api.get<PortfolioResponse>("/api/portfolio"),
        api.get("/api/portfolio/history").catch(() => ({ data: { snapshots: [] } }))
      ]);

      const res = portRes;
      if (histRes?.data?.snapshots) {
        setSnapshots(histRes.data.snapshots);
      }

      if (!res.data?.success) {
        setError(res.data?.error || "Failed to fetch portfolio data.");
        setAccounts([]);
        return;
      }

      const rawPortfolio = Array.isArray(res.data.portfolio)
        ? res.data.portfolio
        : [];

      const normalized = rawPortfolio.map((acc: any) => {
        const positions = Array.isArray(acc.positions)
          ? acc.positions.map((p: any) => ({
              ticker: String(p?.ticker || "UNK"),
              units: Number(p?.units || 0),
              price: Number(p?.price || 0),
              average_purchase_price: Number(p?.average_purchase_price || 0),
              open_pnl: Number(p?.open_pnl || 0),
            }))
          : [];

        const balances = Array.isArray(acc.balances)
          ? acc.balances.map((b: any) => ({
              currency: String(b?.currency || ""),
              cash: Number(b?.cash || 0),
            }))
          : [];

        return {
          account_id: String(acc.account_id || ""),
          account_name: String(acc.account_name || "Brokerage Account"),
          positions: positions.filter((p: any) => p.units > 0 && p.ticker !== "UNK"),
          balances,
          debug: acc.debug,
        };
      });

      setAccounts(normalized);
    } catch {
      setError("Connection error or unauthenticated.");
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async (
    accountId: string,
    symbol: string,
    units: number,
  ) => {
    setSellState({ symbol, status: "loading" });
    try {
      const res = await api.post("/api/trade/sell", {
        account_id: accountId,
        symbol,
        units,
      });

      if (res.data?.success) {
        setSellState({ symbol, status: "success" });
        setTimeout(() => {
          setSellState({ symbol: null, status: "idle" });
          fetchPortfolio();
        }, 2000);
      } else {
        setSellState({ symbol, status: "error" });
      }
    } catch {
      setSellState({ symbol, status: "error" });
    }
  };

  const handleManageBrokerages = async () => {
    setManageLoading(true);
    try {
      const res = await api.post("/api/snaptrade/connect");

      if (res.data?.redirect_url) {
        window.location.href = res.data.redirect_url;
      } else {
        setManageLoading(false);
      }
    } catch {
      setManageLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] bg-grid-vertical flex justify-center items-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 animate-pulse">Establishing Secure Stream...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090b] bg-grid-vertical flex flex-col justify-center items-center text-white p-6 text-center">
        <AlertTriangle className="w-20 h-20 text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]" />
        <h2 className="text-3xl font-black uppercase italic tracking-tighter">Terminal Offline</h2>
        <p className="text-gray-500 mt-4 max-w-md text-[10px] font-black uppercase tracking-widest leading-relaxed">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-8 relative">
      <div className="max-w-6xl mx-auto space-y-12 relative z-10">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-8 md:flex-row md:justify-between md:items-end border-b border-white/5 pb-12"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-yellow-400 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
              <h1 className="text-4xl font-black uppercase italic tracking-tighter">
                Control Center
              </h1>
            </div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] max-w-xl leading-relaxed">
              Real-time synchronization with primary exchange protocols. 
              Manage assets and liquidity across linked brokerage nodes.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05, x: 5 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleManageBrokerages}
            disabled={manageLoading}
            className="group relative bg-yellow-400 hover:bg-yellow-300 text-black font-black py-4 px-8 rounded-2xl shadow-xl shadow-yellow-400/10 transition-all disabled:opacity-50 uppercase italic tracking-widest text-xs flex items-center gap-3"
          >
            {manageLoading ? (
              <div className="w-5 h-5 border-3 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                Manage Nodes
                <ExternalLink className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </>
            )}
          </motion.button>
        </motion.header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Linked Nodes" value={accounts.length} icon={<Activity />} />
          <StatCard label="Live Positions" value={totals.totalPositions} icon={<Target />} />
          <StatCard
            label="Equity Value"
            value={`$${totals.totalMarketValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            icon={<TrendingUp />}
            trend={totals.totalPnL >= 0 ? "up" : "down"}
          />
          <StatCard
            label="Liquid Reserves"
            value={`$${totals.totalCash.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            icon={<Wallet />}
          />
        </section>

        {/* ---- Analytics Charts ---- */}
        {accounts.length > 0 && (
          <PortfolioCharts
            positions={accounts.flatMap((a) => a.positions)}
            totalMarketValue={totals.totalMarketValue}
            totalCash={totals.totalCash}
            snapshots={snapshots}
          />
        )}

        <main className="space-y-12 pb-20">
          {accounts.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center p-20 bg-black/40 rounded-[3rem] border border-white/5 flex flex-col items-center"
            >
              <div className="bg-white/5 p-6 rounded-3xl mb-6">
                <Briefcase className="w-12 h-12 text-gray-700" />
              </div>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
                No active brokerage nodes detected. 
                Establish a link to initialize the dashboard.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-12">
              {accounts.map((account, idx) => (
                <motion.div
                  key={account.account_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-[#111114] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl"
                >
                  <div className="p-10 border-b border-white/5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                        <Activity className="w-6 h-6 text-yellow-400" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter">{account.account_name}</h2>
                        <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest mt-1">
                          ID: {account.account_id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-yellow-400 bg-yellow-400/5 px-4 py-2 rounded-xl border border-yellow-400/20 text-[10px] font-black uppercase tracking-widest">
                      <ShieldCheck className="w-4 h-4" /> Protocol Synced
                    </div>
                  </div>

                  <div className="p-10 bg-black/20">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-6 flex items-center gap-3">
                      <Wallet className="w-4 h-4" />
                      Liquidity Nodes
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {account.balances.map((b: any, i: number) => (
                        <div
                          key={`${b.currency}-${i}`}
                          className="bg-black/40 border border-white/5 rounded-2xl p-6 group hover:border-yellow-400/20 transition-colors"
                        >
                          <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 group-hover:text-yellow-400 transition-colors">
                            {b.currency || "N/A"} RESERVES
                          </div>
                          <div className="text-2xl font-black italic tracking-tighter text-white">
                            {b.cash.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-black/40 text-[10px] font-black uppercase tracking-widest text-gray-600">
                          <th className="p-8">Instrument</th>
                          <th className="p-8">Quantum</th>
                          <th className="p-8">Mark Price</th>
                          <th className="p-8">Avg Entry</th>
                          <th className="p-8">Unrealized P/L</th>
                          <th className="p-8 text-right">Dispatch</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {account.positions.map((p: any, i: number) => {
                          const pnlPositive = p.open_pnl >= 0;
                          return (
                            <tr
                              key={`${p.ticker}-${i}`}
                              className="hover:bg-white/[0.02] transition-colors group"
                            >
                              <td className="p-8">
                                <div className="text-xl font-black italic tracking-tighter text-white group-hover:text-yellow-400 transition-colors">
                                  ${p.ticker}
                                </div>
                              </td>
                              <td className="p-8 text-sm font-black text-gray-500 italic">
                                {p.units.toFixed(2)}
                              </td>
                              <td className="p-8 text-sm font-black text-white italic">
                                ${p.price.toFixed(2)}
                              </td>
                              <td className="p-8 text-sm font-black text-gray-500 italic">
                                ${p.average_purchase_price.toFixed(2)}
                              </td>
                              <td className="p-8">
                                <div className={`text-sm font-black italic ${pnlPositive ? "text-emerald-400" : "text-rose-400"}`}>
                                  {pnlPositive ? "+" : ""}${p.open_pnl.toFixed(2)}
                                </div>
                              </td>
                              <td className="p-8 text-right">
                                <AnimatePresence mode="wait">
                                  {sellState.symbol === p.ticker && sellState.status === "success" ? (
                                    <motion.div 
                                      initial={{ opacity: 0, x: 10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      className="inline-flex items-center gap-2 text-emerald-400 bg-emerald-400/5 px-4 py-2 rounded-xl border border-emerald-400/20 text-[10px] font-black uppercase tracking-widest"
                                    >
                                      <CheckCircle2 className="w-4 h-4" /> Order Sent
                                    </motion.div>
                                  ) : (
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => handleSell(account.account_id, p.ticker, p.units)}
                                      disabled={sellState.symbol === p.ticker && sellState.status === "loading"}
                                      className="inline-flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 font-black py-2 px-6 rounded-xl transition-all disabled:opacity-50 text-[10px] uppercase tracking-widest italic"
                                    >
                                      {sellState.symbol === p.ticker && sellState.status === "loading" ? (
                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <>
                                          Sell <TrendingDown className="w-4 h-4" />
                                        </>
                                      )}
                                    </motion.button>
                                  )}
                                </AnimatePresence>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {account.debug && (
                    <div className="p-6 bg-black/40 border-t border-white/5">
                      <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.2em] text-gray-700">
                        <Bug className="w-4 h-4" />
                        <span>Telemetry:</span>
                        <span className="bg-white/5 py-1 px-2 rounded-md">RAW_COUNT: {account.debug.raw_positions_count}</span>
                        <span className="bg-white/5 py-1 px-2 rounded-md">PARSED_COUNT: {account.debug.parsed_positions_count}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>
      
      {/* Dynamic Background Noise */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-0" />
    </div>
  );
}


