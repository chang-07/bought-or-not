"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  Wallet,
  Bug,
} from "lucide-react";
import axios from "axios";

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

export default function PortfolioPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sellState, setSellState] = useState<{
    symbol: string | null;
    status: "idle" | "loading" | "success" | "error";
  }>({
    symbol: null,
    status: "idle",
  });
  const [manageLoading, setManageLoading] = useState(false);

  useEffect(() => {
    fetchPortfolio();
  }, []);

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
      const res = await axios.get<PortfolioResponse>("/api/portfolio", {
        withCredentials: true,
      });

      if (!res.data?.success) {
        setError(res.data?.error || "Failed to fetch portfolio data.");
        setAccounts([]);
        return;
      }

      const rawPortfolio = Array.isArray(res.data.portfolio)
        ? res.data.portfolio
        : [];

      // Align exactly with backend schema:
      // account => { account_id, account_name, positions[], balances[], debug? }
      const normalized = rawPortfolio.map((acc) => {
        const positions = Array.isArray(acc.positions)
          ? acc.positions.map((p) => ({
              ticker: String(p?.ticker || "UNK"),
              units: Number(p?.units || 0),
              price: Number(p?.price || 0),
              average_purchase_price: Number(p?.average_purchase_price || 0),
              open_pnl: Number(p?.open_pnl || 0),
            }))
          : [];

        const balances = Array.isArray(acc.balances)
          ? acc.balances.map((b) => ({
              currency: String(b?.currency || ""),
              cash: Number(b?.cash || 0),
            }))
          : [];

        return {
          account_id: String(acc.account_id || ""),
          account_name: String(acc.account_name || "Brokerage Account"),
          positions: positions.filter((p) => p.units > 0 && p.ticker !== "UNK"),
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
      const res = await axios.post(
        "/api/trade/sell",
        {
          account_id: accountId,
          symbol,
          units,
        },
        { withCredentials: true },
      );

      if (res.data?.success) {
        setSellState({ symbol, status: "success" });
        setTimeout(() => {
          setSellState({ symbol: null, status: "idle" });
          fetchPortfolio();
        }, 2000);
      } else {
        setSellState({ symbol, status: "error" });
        alert(res.data?.error || "Failed to sell.");
      }
    } catch {
      setSellState({ symbol, status: "error" });
      alert("Connection error during sell execution.");
    }
  };

  const handleManageBrokerages = async () => {
    setManageLoading(true);
    try {
      const res = await axios.post(
        "/api/snaptrade/connect",
        {},
        {
          withCredentials: true,
        },
      );

      if (res.data?.redirect_url) {
        window.location.href = res.data.redirect_url;
      } else {
        alert(res.data?.error || "Failed to generate portal.");
        setManageLoading(false);
      }
    } catch {
      alert("Failed to reach server.");
      setManageLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex justify-center items-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col justify-center items-center text-white p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-rose-500 mb-4" />
        <h2 className="text-2xl font-bold">Unable to Load Portfolio</h2>
        <p className="text-gray-400 mt-2 max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-6 relative">
      <div className="fixed top-[-10%] left-[50%] -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-blue-600/5 blur-[150px] pointer-events-none" />

      <div className="max-w-5xl mx-auto mb-10 relative z-10 pt-6">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:justify-between md:items-start">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-blue-500" />
              My Portfolio
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Manage your SnapTrade synced holdings and close out copied
              pitches.
            </p>
          </div>

          <button
            onClick={handleManageBrokerages}
            disabled={manageLoading}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-5 rounded-full transition-colors flex items-center shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {manageLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Manage Brokerages"
            )}
          </button>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <StatCard label="Accounts" value={accounts.length} />
          <StatCard label="Open Positions" value={totals.totalPositions} />
          <StatCard
            label="Market Value"
            value={`$${totals.totalMarketValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          />
          <StatCard
            label="USD Cash"
            value={`$${totals.totalCash.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          />
        </section>

        <main className="space-y-8">
          {accounts.length === 0 ? (
            <div className="text-center p-12 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-gray-400">
                No brokerage accounts found. Please link one on the connection
                portal.
              </p>
            </div>
          ) : (
            accounts.map((account) => (
              <div
                key={account.account_id}
                className="bg-[#18181b]/80 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-xl"
              >
                <div className="p-6 border-b border-white/10 bg-white/5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <h2 className="text-xl font-bold">{account.account_name}</h2>
                  <span className="text-xs text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full uppercase tracking-wider font-semibold border border-blue-500/20 w-fit">
                    Synced
                  </span>
                </div>

                <div className="p-6 border-b border-white/10">
                  <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    Balances
                  </h3>
                  {account.balances.length === 0 ? (
                    <p className="text-sm text-gray-500">No balance data.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {account.balances.map((b, i) => (
                        <div
                          key={`${b.currency}-${i}`}
                          className="bg-black/30 border border-white/10 rounded-xl p-3"
                        >
                          <div className="text-xs text-gray-400">
                            {b.currency || "N/A"}
                          </div>
                          <div className="text-lg font-semibold">
                            {b.cash.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-0">
                  {account.positions.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">
                      No tradable equity positions found in this account.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-black/20 text-xs uppercase tracking-wider text-gray-400">
                          <th className="p-4 font-semibold">Symbol</th>
                          <th className="p-4 font-semibold">Shares</th>
                          <th className="p-4 font-semibold">Price</th>
                          <th className="p-4 font-semibold">Avg Cost</th>
                          <th className="p-4 font-semibold">Open P/L</th>
                          <th className="p-4 font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {account.positions.map((p, i) => {
                          const pnlPositive = p.open_pnl >= 0;
                          return (
                            <tr
                              key={`${p.ticker}-${i}`}
                              className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                            >
                              <td className="p-4">
                                <div className="font-bold text-lg text-white">
                                  ${p.ticker}
                                </div>
                              </td>
                              <td className="p-4 text-gray-300">
                                {p.units.toFixed(4)}
                              </td>
                              <td className="p-4 text-gray-300">
                                ${p.price.toFixed(2)}
                              </td>
                              <td className="p-4 text-gray-300">
                                ${p.average_purchase_price.toFixed(2)}
                              </td>
                              <td
                                className={`p-4 font-semibold ${pnlPositive ? "text-emerald-400" : "text-rose-400"}`}
                              >
                                {pnlPositive ? "+" : ""}${p.open_pnl.toFixed(2)}
                              </td>
                              <td className="p-4">
                                {sellState.symbol === p.ticker &&
                                sellState.status === "success" ? (
                                  <span className="flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-lg w-fit">
                                    <CheckCircle2 className="w-4 h-4" /> Ordered
                                  </span>
                                ) : (
                                  <button
                                    onClick={() =>
                                      handleSell(
                                        account.account_id,
                                        p.ticker,
                                        p.units,
                                      )
                                    }
                                    disabled={
                                      sellState.symbol === p.ticker &&
                                      sellState.status === "loading"
                                    }
                                    className="flex items-center gap-2 bg-rose-500/20 hover:bg-rose-500 hover:text-white border border-rose-500/50 text-rose-400 font-medium py-1.5 px-4 rounded-xl transition-all disabled:opacity-50"
                                  >
                                    {sellState.symbol === p.ticker &&
                                    sellState.status === "loading" ? (
                                      <div className="w-4 h-4 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
                                    ) : (
                                      <>
                                        Sell Position{" "}
                                        <TrendingDown className="w-4 h-4" />
                                      </>
                                    )}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="p-4 border-t border-white/10 bg-black/20">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Bug className="w-4 h-4" />
                    <span>Debug:</span>
                    <span>
                      raw_positions={account.debug?.raw_positions_count ?? 0}
                    </span>
                    <span>
                      parsed_positions=
                      {account.debug?.parsed_positions_count ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[#18181b]/80 border border-white/10 p-4 rounded-2xl">
      <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">
        {label}
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}
