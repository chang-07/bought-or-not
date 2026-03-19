"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  ShieldCheck,
  Clock,
  X,
  DollarSign,
} from "lucide-react";
import axios from "axios";
import TradeModal from "@/components/TradeModal";
import dynamic from 'next/dynamic';

const PdfThumbnail = dynamic(() => import("@/components/PdfThumbnail"), { ssr: false });

type Pitch = {
  id: number;
  ticker: string;
  author_username: string;
  target_price: number;
  entry_price: number | null;
  current_alpha: number;
  status: string;
  content_body: string;
  deck_url: string | null;
  is_verified?: boolean;
};

export default function DashboardPage() {
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dismissed, setDismissed] = useState<Set<number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('vspp_dismissed');
        return saved ? new Set(JSON.parse(saved)) : new Set();
      } catch { return new Set(); }
    }
    return new Set();
  });

  const clearPitch = (id: number) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('vspp_dismissed', JSON.stringify([...next]));
      return next;
    });
  };

  const visiblePitches = pitches.filter(p => !dismissed.has(p.id));

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPitch, setSelectedPitch] = useState<{
    id: number;
    ticker: string;
  } | null>(null);

  const fetchPitches = async (query = "") => {
    setLoading(true);
    try {
      const baseURL = "";
      const res = await axios.get(
        `${baseURL}/api/pitches${query ? `?search=${query}` : ""}`,
        {
          withCredentials: true,
        },
      );
      setPitches(res.data);
    } catch (err) {
      console.error("Failed to fetch pitches", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPitches();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPitches(search);
  };

  return (
    <div className="min-h-screen p-6 relative">
      <header className="max-w-4xl mx-auto mb-12 flex flex-col md:flex-row md:items-end justify-between relative z-10 pt-10 gap-6">
        <div>
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="w-2 h-8 bg-yellow-400 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">
              Terminal Feed
            </h1>
          </motion.div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em] ml-5">
            Real-time verified asymmetric intelligence
          </p>
        </div>

        <motion.form 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onSubmit={handleSearch} 
          className="relative w-full md:w-80 group"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-yellow-400 transition-colors" />
          <input
            type="text"
            placeholder="FILTER BY TICKER / AUTHOR"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/60 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-xs font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all text-white placeholder:text-gray-600 uppercase"
          />
        </motion.form>
      </header>

      <main className="max-w-4xl mx-auto space-y-8 relative z-10 pb-24">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center p-20"
            >
              <div className="w-10 h-10 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
            </motion.div>
          ) : visiblePitches.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center p-20 bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-md"
            >
              <p className="text-gray-500 font-bold uppercase tracking-widest">
                {pitches.length > 0 ? 'All pitches cleared from view' : 'No active data streams found'}
              </p>
              {pitches.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setDismissed(new Set()); localStorage.removeItem('vspp_dismissed'); }}
                  className="mt-6 text-[10px] font-black uppercase tracking-widest text-yellow-400 border border-yellow-400/20 px-6 py-2 rounded-xl hover:bg-yellow-400/10 transition-all"
                >
                  Restore All
                </motion.button>
              )}
            </motion.div>
          ) : (
            visiblePitches.map((pitch, idx) => (
              <motion.article
                key={pitch.id}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                className="group bg-[#111114]/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] overflow-hidden hover:border-yellow-400/30 transition-all shadow-2xl relative"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                  <div className="text-[60px] font-black text-white/5 pointer-events-none select-none italic tracking-tighter">
                    #{idx + 1}
                  </div>
                </div>

                <div className="p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                    <div className="flex items-center gap-6">
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="bg-yellow-400 text-black font-black px-6 py-4 rounded-2xl text-3xl shadow-[0_0_20px_rgba(250,204,21,0.2)] italic"
                      >
                        ${pitch.ticker}
                      </motion.div>
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg text-white">
                            @{pitch.author_username}
                          </span>
                          <span
                            className={`flex items-center gap-1.5 text-[9px] uppercase font-black tracking-widest px-3 py-1 rounded-full border ${pitch.is_verified ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-yellow-400/10 text-yellow-500 border-yellow-400/20"}`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {pitch.is_verified
                              ? "Verified"
                              : "Verification Pending"}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-2 flex items-center gap-2 font-black uppercase tracking-widest">
                          <Clock className="w-3.5 h-3.5 text-yellow-400/70" />
                          Target Strike: <span className="text-white">${pitch.target_price.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`flex flex-col items-end px-6 py-3 rounded-2xl bg-black/40 border border-white/5 ${pitch.current_alpha >= 0 ? "text-emerald-400 border-emerald-500/10" : "text-rose-400 border-rose-500/10"}`}
                    >
                      <div className="flex items-center gap-1.5 font-black text-2xl italic tracking-tighter">
                        {pitch.current_alpha >= 0 ? "+" : ""}
                        {(pitch.current_alpha * 100).toFixed(2)}%
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Alpha vs SPY Benchmark</span>
                    </div>
                  </div>

                  <div className="relative mb-8">
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-yellow-400/20 rounded-full" />
                    <p className="text-gray-400 text-sm leading-relaxed font-medium pl-4 line-clamp-4">
                      {pitch.content_body}
                    </p>
                  </div>

                  <div className="pt-8 border-t border-white/5 space-y-6">
                    {pitch.deck_url && (
                      <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-inner group-hover:border-yellow-400/20 transition-colors">
                        <PdfThumbnail url={pitch.deck_url} ticker={pitch.ticker} />
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-3">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => clearPitch(pitch.id)}
                        className="flex items-center gap-2 border border-white/10 text-gray-500 hover:text-red-400 hover:border-red-400/30 font-black py-3 px-6 rounded-xl transition-all uppercase tracking-widest text-xs italic"
                      >
                        Clear
                        <X className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05, x: 5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setSelectedPitch({
                            id: pitch.id,
                            ticker: pitch.ticker,
                          });
                          setIsModalOpen(true);
                        }}
                        className="flex items-center gap-3 bg-yellow-400 text-black font-black py-3 px-8 rounded-xl shadow-xl shadow-yellow-400/10 hover:bg-yellow-300 transition-all uppercase tracking-widest text-xs italic"
                      >
                        Invest
                        <DollarSign className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))
          )}
        </AnimatePresence>
      </main>

      {/* Trade Execution Modal */}
      <TradeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPitch(null);
        }}
        pitchId={selectedPitch?.id || null}
        ticker={selectedPitch?.ticker || ""}
      />
    </div>
  );
}
