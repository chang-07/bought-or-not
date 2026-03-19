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
    <div className="min-h-screen bg-[#09090b] text-white p-6 relative">
      {/* Background Glow */}
      <div className="fixed top-[-10%] left-[50%] -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-blue-600/5 blur-[150px] pointer-events-none" />

      <header className="max-w-4xl mx-auto mb-10 flex items-center justify-between relative z-10 pt-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-500" />
            Global Feed
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Discover verified asymmetric ideas.
          </p>
        </div>

        <form onSubmit={handleSearch} className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Ticker or Author"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-white placeholder:text-gray-500"
          />
        </form>
      </header>

      <main className="max-w-4xl mx-auto space-y-6 relative z-10 pb-20">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center p-12"
            >
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </motion.div>
          ) : pitches.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center p-12 bg-white/5 rounded-2xl border border-white/10"
            >
              <p className="text-gray-400">
                No active pitches found. Be the first!
              </p>
            </motion.div>
          ) : (
            pitches.map((pitch, idx) => (
              <motion.article
                key={pitch.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="bg-[#18181b]/80 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all shadow-xl"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold px-4 py-2 rounded-xl text-xl">
                        ${pitch.ticker}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-200">
                            @{pitch.author_username}
                          </span>
                          <span
                            className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${pitch.is_verified ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            {pitch.is_verified
                              ? "Verified Holder"
                              : "Pending Verification"}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          Target: ${pitch.target_price.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`flex flex-col items-end ${pitch.current_alpha >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                    >
                      <div className="flex items-center gap-1 font-semibold text-lg">
                        {pitch.current_alpha >= 0 ? (
                          <TrendingUp className="w-5 h-5" />
                        ) : (
                          <TrendingDown className="w-5 h-5" />
                        )}
                        {(pitch.current_alpha * 100).toFixed(2)}%
                      </div>
                      <span className="text-xs opacity-70">Alpha vs SPY</span>
                    </div>
                  </div>

                  <p className="text-gray-300 text-sm leading-relaxed mb-6 line-clamp-3">
                    {pitch.content_body}
                  </p>

                  <div className="pt-4 border-t border-white/10 space-y-4">
                    {pitch.deck_url && (
                      <PdfThumbnail url={pitch.deck_url} ticker={pitch.ticker} />
                    )}

                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => {
                          setSelectedPitch({
                            id: pitch.id,
                            ticker: pitch.ticker,
                          });
                          setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-2 px-5 rounded-xl shadow-lg transition-all active:scale-[0.98]"
                      >
                        1-Click Trade
                        <ExternalLink className="w-4 h-4" />
                      </button>
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
