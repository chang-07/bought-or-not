"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  BarChart3,
  Clock3,
  Target,
  TrendingDown,
  TrendingUp,
  Search,
  ShieldCheck,
} from "lucide-react";
import axios from "axios";
import dynamic from "next/dynamic";

const PdfThumbnail = dynamic(() => import("@/components/PdfThumbnail"), { ssr: false });

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] bg-grid-vertical flex justify-center items-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 animate-pulse">Syncing Pitch Intel...</span>
        </div>
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
                Intelligence Brief
              </h1>
            </div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] max-w-xl leading-relaxed">
              Track your deployed theses and monitor performance synchronization across global equity nodes.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-yellow-400 transition-colors" />
              <input
                type="text"
                placeholder="FILTER INTEL..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-black/60 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-yellow-400/50 placeholder:text-gray-700 w-64 transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "CLOSED" | "TARGET_HIT")}
              className="bg-black/60 border border-white/10 rounded-2xl py-3 px-6 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-yellow-400/50 appearance-none cursor-pointer transition-all pr-12"
            >
              <option value="ALL">ALL STATUS</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="TARGET_HIT">TARGET HIT</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
        </motion.header>

        {data && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12"
          >
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Ops"
                value={data.author.total_pitches}
                icon={<Activity />}
              />
              <StatCard
                label="Active Streams"
                value={data.author.active_pitches}
                icon={<Clock3 />}
              />
              <StatCard
                label="Verified Intel"
                value={data.author.verified_pitches}
                icon={<ShieldCheck />}
              />
              <StatCard
                label="Accuracy Rating"
                value={`${data.author.win_rate.toFixed(1)}%`}
                icon={<Target />}
              />
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                label="Avg Alpha Generation"
                value={`${(data.author.avg_alpha * 100).toFixed(2)}%`}
                trend={data.author.avg_alpha >= 0 ? "up" : "down"}
                icon={<TrendingUp />}
              />
              <StatCard
                label="Cumulative Alpha"
                value={`${(data.author.total_alpha * 100).toFixed(2)}%`}
                trend={data.author.total_alpha >= 0 ? "up" : "down"}
                icon={<BarChart3 />}
              />
            </section>

            <section className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-1 h-6 bg-yellow-400 rounded-full" />
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Mission History</h2>
              </div>

              <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                  {filteredPitches.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center p-20 bg-black/40 rounded-[3rem] border border-white/5"
                    >
                      <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
                        Zero intelligence matches for active filters.
                      </p>
                    </motion.div>
                  ) : (
                    filteredPitches.map((pitch, idx) => (
                      <motion.article
                        key={pitch.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-[#111114] border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-yellow-400/20 transition-all shadow-2xl group"
                      >
                        <div className="p-10">
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 mb-10">
                            <div className="flex items-start gap-6">
                              <div className="bg-yellow-400 p-4 rounded-2xl shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                                <span className="text-2xl font-black italic tracking-tighter text-black">${pitch.ticker}</span>
                              </div>
                              <div className="space-y-2">
                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                  Deployed {formatDate(pitch.created_at)}
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge
                                    tone={pitch.is_verified ? "emerald" : "amber"}
                                  >
                                    {pitch.is_verified ? "SECURE_VERIFIED" : "PENDING_SCAN"}
                                  </Badge>
                                  <Badge tone={statusTone(pitch.status)}>
                                    {pitch.status}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            <div
                              className={`flex items-center gap-3 font-black text-3xl italic tracking-tighter ${
                                pitch.current_alpha >= 0
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {pitch.current_alpha >= 0 ? (
                                <TrendingUp className="w-8 h-8" />
                              ) : (
                                <TrendingDown className="w-8 h-8" />
                              )}
                              {(pitch.current_alpha * 100).toFixed(2)}%
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                            <div className="bg-black/40 border border-white/5 rounded-2xl p-6 group-hover:border-yellow-400/10 transition-colors">
                              <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1.5">
                                Strike Entry
                              </div>
                              <div className="text-2xl font-black italic tracking-tighter text-white">
                                {pitch.entry_price != null
                                  ? `$${pitch.entry_price.toFixed(2)}`
                                  : "—"}
                              </div>
                            </div>
                            <div className="bg-black/40 border border-white/5 rounded-2xl p-6 group-hover:border-yellow-400/10 transition-colors">
                              <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1.5">
                                Objective Target
                              </div>
                              <div className="text-2xl font-black italic tracking-tighter text-white">
                                ${pitch.target_price.toFixed(2)}
                              </div>
                            </div>
                          </div>

                          <p className="text-gray-400 text-xs font-medium leading-relaxed mb-10 line-clamp-3 group-hover:line-clamp-none transition-all">
                            {pitch.content_body}
                          </p>

                          {pitch.deck_url && (
                            <div className="space-y-4 pt-10 border-t border-white/5">
                              <div className="flex items-center justify-between mb-4 px-2">
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">Attachment: Intelligence Artifact</div>
                                <ShieldCheck className="w-4 h-4 text-yellow-400/50" />
                              </div>
                              <div className="max-w-xl">
                                <PdfThumbnail url={pitch.deck_url} ticker={pitch.ticker} />
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.article>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </section>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  trend
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: "up" | "down";
}) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-[#111114] border border-white/5 p-8 rounded-[2rem] relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 blur-[50px] rounded-full -mr-16 -mt-16 group-hover:bg-yellow-400/10 transition-colors" />
      
      <div className="flex items-center justify-between mb-6">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 group-hover:text-yellow-400 transition-colors">
          {label}
        </div>
        <div className="text-gray-600 group-hover:text-yellow-400 transition-colors">
          {icon}
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <div className="text-3xl font-black italic tracking-tighter text-white">
          {value}
        </div>
        {trend && (
          <div className={`p-1.5 rounded-lg ${trend === 'up' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-rose-400/10 text-rose-400'}`}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
        )}
      </div>
    </motion.div>
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
    emerald: "bg-emerald-400/5 text-emerald-400 border-emerald-400/20",
    amber: "bg-yellow-400/5 text-yellow-500 border-yellow-400/20",
    blue: "bg-yellow-400/5 text-yellow-400 border-yellow-400/20",
    gray: "bg-white/5 text-gray-500 border-white/10",
    rose: "bg-rose-400/5 text-rose-400 border-rose-400/20",
  }[tone];

  return (
    <span
      className={`px-3 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest ${styles}`}
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
