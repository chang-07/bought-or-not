"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock3,
  Target,
  TrendingDown,
  TrendingUp,
  Eye,
  FileText,
} from "lucide-react";
import axios from "axios";

type MyPitch = {
  id: number;
  ticker: string;
  target_price: number;
  entry_price: number | null;
  current_alpha: number;
  status: string;
  is_verified: boolean;
  content_body: string;
  created_at: string;
  deck_url: string | null;
};

type MyPitchAnalytics = {
  author: {
    username: string;
    total_pitches: number;
    active_pitches: number;
    verified_pitches: number;
    closed_pitches: number;
    win_rate: number;
    avg_alpha: number;
    total_alpha: number;
  };
  pitches: MyPitch[];
};

export default function MyPitchesPage() {
  const [data, setData] = useState<MyPitchAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "CLOSED" | "TARGET_HIT"
  >("ALL");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const fetchMyPitches = async () => {
      setLoading(true);
      setError("");
      try {
        const baseURL = "";
        const res = await axios.get(`${baseURL}/api/my/pitches`, {
          withCredentials: true,
        });

        if (res.data?.error) {
          setError(res.data.error);
          setData(null);
          return;
        }

        setData(res.data as MyPitchAnalytics);
      } catch {
        setError("Failed to load your pitches.");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMyPitches();
  }, []);

  const filteredPitches = useMemo(() => {
    if (!data) return [];
    return data.pitches.filter((p) => {
      const byStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "CLOSED"
            ? p.status !== "ACTIVE" && p.status !== "TARGET_HIT"
            : p.status === statusFilter;

      const q = query.trim().toLowerCase();
      const byQuery =
        q.length === 0 ||
        p.ticker.toLowerCase().includes(q) ||
        p.content_body.toLowerCase().includes(q);

      return byStatus && byQuery;
    });
  }, [data, statusFilter, query]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-6 relative">
      <div className="fixed top-[-10%] left-[50%] -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-blue-600/5 blur-[150px] pointer-events-none" />

      <header className="max-w-6xl mx-auto mb-8 relative z-10 pt-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-500" />
              My Pitches
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Track your pitch performance and verification progress.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search ticker or thesis..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="TARGET_HIT">Target Hit</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto relative z-10 pb-20 space-y-6">
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center p-12 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-red-400 font-medium">{error}</p>
          </div>
        ) : !data ? (
          <div className="text-center p-12 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-gray-400">No analytics available.</p>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Pitches"
                value={data.author.total_pitches}
                icon={<Activity className="w-4 h-4 text-blue-400" />}
              />
              <StatCard
                label="Active"
                value={data.author.active_pitches}
                icon={<Clock3 className="w-4 h-4 text-amber-400" />}
              />
              <StatCard
                label="Verified"
                value={data.author.verified_pitches}
                icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              />
              <StatCard
                label="Win Rate"
                value={`${data.author.win_rate.toFixed(1)}%`}
                icon={<Target className="w-4 h-4 text-fuchsia-400" />}
              />
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
              <StatCard
                label="Average Alpha"
                value={`${(data.author.avg_alpha * 100).toFixed(2)}%`}
                icon={
                  data.author.avg_alpha >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                  )
                }
              />
              <StatCard
                label="Total Alpha"
                value={`${(data.author.total_alpha * 100).toFixed(2)}%`}
                icon={
                  data.author.total_alpha >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                  )
                }
              />
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold">Your Pitch History</h2>

              <AnimatePresence mode="popLayout">
                {filteredPitches.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center p-10 bg-white/5 rounded-2xl border border-white/10"
                  >
                    <p className="text-gray-400">
                      No pitches match your filters.
                    </p>
                  </motion.div>
                ) : (
                  filteredPitches.map((pitch, idx) => (
                    <motion.article
                      key={pitch.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.04 }}
                      className="bg-[#18181b]/80 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all shadow-xl"
                    >
                      <div className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                          <div className="flex items-start gap-4">
                            <div className="bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold px-4 py-2 rounded-xl text-xl">
                              ${pitch.ticker}
                            </div>
                            <div>
                              <div className="text-sm text-gray-400">
                                Posted {formatDate(pitch.created_at)}
                              </div>
                              <div className="text-xs mt-2 flex items-center gap-2">
                                <Badge
                                  tone={pitch.is_verified ? "emerald" : "amber"}
                                >
                                  {pitch.is_verified
                                    ? "Verified"
                                    : "Pending Verification"}
                                </Badge>
                                <Badge tone={statusTone(pitch.status)}>
                                  {pitch.status}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div
                            className={`flex items-center gap-1 font-semibold text-lg ${
                              pitch.current_alpha >= 0
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }`}
                          >
                            {pitch.current_alpha >= 0 ? (
                              <TrendingUp className="w-5 h-5" />
                            ) : (
                              <TrendingDown className="w-5 h-5" />
                            )}
                            {(pitch.current_alpha * 100).toFixed(2)}%
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                            <div className="text-xs text-gray-400 mb-1">
                              Entry Price
                            </div>
                            <div className="font-semibold">
                              {pitch.entry_price != null
                                ? `$${pitch.entry_price.toFixed(2)}`
                                : "—"}
                            </div>
                          </div>
                          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                            <div className="text-xs text-gray-400 mb-1">
                              Target Price
                            </div>
                            <div className="font-semibold">
                              ${pitch.target_price.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <p className="text-gray-300 text-sm leading-relaxed mb-4 line-clamp-3">
                          {pitch.content_body}
                        </p>

                        {pitch.deck_url && (
                          <div className="space-y-3">
                            <div className="rounded-xl overflow-hidden border border-white/10 bg-black/30">
                              <div className="px-3 py-2 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5" />
                                Deck Preview
                              </div>
                              <iframe
                                src={pitch.deck_url}
                                title={`${pitch.ticker} deck preview`}
                                className="w-full h-80 bg-white"
                              />
                            </div>

                            <a
                              href={pitch.deck_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/10"
                            >
                              <Eye className="w-4 h-4" />
                              Open Deck in New Tab
                            </a>
                          </div>
                        )}
                      </div>
                    </motion.article>
                  ))
                )}
              </AnimatePresence>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-[#18181b]/80 border border-white/10 p-5 rounded-2xl flex flex-col justify-center">
      <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
        {icon} {label}
      </div>
      <div className="text-3xl font-bold text-gray-100">{value}</div>
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "emerald" | "amber" | "blue" | "gray" | "rose";
}) {
  const styles = {
    emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    gray: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    rose: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  }[tone];

  return (
    <span
      className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${styles}`}
    >
      {children}
    </span>
  );
}

function statusTone(
  status: string,
): "emerald" | "amber" | "blue" | "gray" | "rose" {
  if (status === "TARGET_HIT") return "emerald";
  if (status === "ACTIVE") return "blue";
  if (status === "CLOSED") return "rose";
  return "gray";
}
