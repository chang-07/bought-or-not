"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ShieldCheck,
  Clock,
  X,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import api from "@/lib/api";
import TradeModal from "@/components/TradeModal";
import dynamic from 'next/dynamic';
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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

export default function DashboardClient() {
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [dismissed, setDismissed] = useState<number[]>([]);

  useEffect(() => {
    fetchPitches();
  }, []);

  const handleDismiss = async (id: number) => {
    setDismissed((prev) => [...prev, id]);
    try {
      await api.post(`/api/pitches/${id}/hide`);
    } catch (err) {
      console.error("Failed to dismiss", err);
    }
  };

  const clearDismissed = async () => {
    try {
      await api.post("/api/pitches/restore_all");
      setDismissed([]);
      fetchPitches();
    } catch (err) {
      console.error("Failed to restore", err);
    }
  };

  const visiblePitches = pitches.filter(p => !dismissed.includes(p.id));

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPitch, setSelectedPitch] = useState<{
    id: number;
    ticker: string;
  } | null>(null);

  const fetchPitches = async (query = "") => {
    setLoading(true);
    try {
      const res = await api.get(`/api/pitches${query ? `?search=${query}` : ""}`);
      setPitches(res.data);
    } catch (err) {
      console.error("Failed to fetch pitches", err);
    } finally {
      setLoading(false);
    }
  };

  const [refreshing, setRefreshing] = useState(false);
  const refreshAlpha = async () => {
    setRefreshing(true);
    try {
      await api.post('/api/alpha/refresh');
      await fetchPitches(search);
    } catch (err) {
      console.error('Failed to refresh alpha', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPitches(search);
  };

  return (
    <div className="min-h-screen p-6 relative">
      <header className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row md:items-end justify-between relative z-10 pt-10 gap-6">
        <div>
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="w-2 h-8 bg-yellow-400 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">
              All Pitches
            </h1>
          </motion.div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em] ml-5">
            Real-time verified pitches
          </p>
        </div>

        <motion.form 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onSubmit={handleSearch} 
          className="relative w-full md:w-80 group"
        >
          <Input
            icon={<Search className="w-4 h-4" />}
            type="text"
            placeholder="Search Ticker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </motion.form>

          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            onClick={refreshAlpha}
            disabled={refreshing}
            className="p-3 rounded-2xl border border-white/10 hover:border-yellow-400/30 hover:bg-yellow-400/5 transition-all disabled:opacity-50 group bg-[#111114]"
            title="Refresh alpha scores via Finnhub"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 group-hover:text-yellow-400 transition-colors ${refreshing ? 'animate-spin' : ''}`} />
          </motion.button>
        </header>

      <main className="max-w-7xl mx-auto space-y-8 relative z-10 pb-24">
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
                {pitches.length > 0 ? 'All pitches cleared from view' : 'No active pitches found'}
              </p>
              {pitches.length > 0 && (
                <div className="mt-8 flex justify-center">
                  <Button
                    variant="ghost"
                    onClick={() => clearDismissed()}
                  >
                    Restore All
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            visiblePitches.map((pitch, idx) => (
              <Card
                key={pitch.id}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
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
                      <Button
                        variant="ghost"
                        onClick={() => handleDismiss(pitch.id)}
                      >
                        Clear <X className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => {
                          setSelectedPitch({
                            id: pitch.id,
                            ticker: pitch.ticker,
                          });
                          setIsModalOpen(true);
                        }}
                      >
                        Invest <DollarSign className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
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
