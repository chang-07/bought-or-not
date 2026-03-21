"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  ShieldCheck,
  Clock,
  ExternalLink,
  Award,
  Target,
  Activity,
} from "lucide-react";
import api from "@/lib/api";
import { useParams } from "next/navigation";
import TradeModal from "@/components/TradeModal";
import dynamic from 'next/dynamic';

const PdfThumbnail = dynamic(() => import("@/components/PdfThumbnail"), { ssr: false });

type Pitch = {
  id: number;
  ticker: string;
  target_price: number;
  entry_price: number | null;
  current_alpha: number;
  status: string;
  content_body: string;
  deck_url: string | null;
};

interface AuthorData {
  total_aum: number;
  win_rate: number;
  avg_alpha: number;
  total_pitches: number;
}

export default function AuthorClient({ initialProfile, username }: { initialProfile: any; username: string }) {
  const [authorData, setAuthorData] = useState<AuthorData | null>(initialProfile?.author || null);
  const [pitches, setPitches] = useState<Pitch[]>(initialProfile?.pitches || []);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPitch, setSelectedPitch] = useState<{
    id: number;
    ticker: string;
  } | null>(null);

  // Initial state passed via SSR

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!authorData) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center text-white p-6 text-center">
        <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Author Not Found</h2>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">
          No pitches found for this user.
        </p>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen text-white p-6 relative">
      <motion.header 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="max-w-4xl mx-auto mb-16 relative z-10 pt-10"
      >
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-center md:items-end gap-8 mb-12">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-32 h-32 rounded-[2.5rem] bg-yellow-400 flex items-center justify-center text-5xl font-black shadow-[0_0_40px_rgba(250,204,21,0.3)] text-black italic border-4 border-black"
          >
            {username.charAt(0).toUpperCase()}
          </motion.div>
          <div className="text-center md:text-left">
            <h1 className="text-5xl font-black tracking-tighter uppercase italic mb-2">@{username}</h1>
            <p className="text-yellow-400 text-xs mt-1 font-black uppercase tracking-[0.3em] flex items-center justify-center md:justify-start gap-2">
              <ShieldCheck className="w-4 h-4" /> Verified Author
            </p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Assets Under Management", value: `$${authorData.total_aum.toLocaleString()}`, icon: Award, color: "yellow-400" },
            { label: "Win Rate", value: `${authorData.win_rate.toFixed(1)}%`, icon: Target, color: "emerald-400" },
            { label: "Average Alpha", value: `${(authorData.avg_alpha * 100).toFixed(2)}%`, icon: Activity, color: "yellow-400" },
            { label: "Total Pitches", value: authorData.total_pitches, icon: TrendingUp, color: "gray-200" }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -5 }}
              className="bg-[#111114]/90 border border-white/10 p-6 rounded-3xl flex flex-col justify-center relative overflow-hidden group hover:border-yellow-400/30 transition-all"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="text-gray-500 text-[9px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                <stat.icon className={`w-3.5 h-3.5 text-${stat.color}`} /> {stat.label}
              </div>
              <div className={`text-2xl font-black italic tracking-tighter text-${stat.color}`}>
                {stat.value}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.header>

      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="max-w-4xl mx-auto space-y-8 relative z-10 pb-24"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1.5 h-6 bg-yellow-400 rounded-full" />
          <h2 className="text-xl font-black uppercase tracking-widest italic">Pitch History</h2>
        </div>

        <AnimatePresence>
          {pitches.length === 0 ? (
            <div className="text-center p-20 bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-md">
              <p className="text-gray-500 font-bold uppercase tracking-widest">
                NO PITCHES FOUND
              </p>
            </div>
          ) : (
            pitches.map((pitch, idx) => (
              <motion.article
                key={pitch.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="group bg-[#111114]/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] overflow-hidden hover:border-yellow-400/30 transition-all shadow-2xl"
              >
                <div className="p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                    <div className="flex items-center gap-6">
                      <div className="bg-yellow-400 text-black font-black px-6 py-4 rounded-2xl text-2xl shadow-[0_0_20px_rgba(250,204,21,0.2)] italic border-2 border-black">
                        ${pitch.ticker}
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-2 font-black uppercase tracking-widest">
                          <Clock className="w-3.5 h-3.5 text-yellow-400/70" />
                          Target Strike: <span className="text-white">${pitch.target_price.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`flex flex-col items-end px-5 py-2 rounded-xl bg-black/40 border border-white/5 ${pitch.current_alpha >= 0 ? "text-emerald-400 border-emerald-500/10" : "text-rose-400 border-rose-500/10"}`}
                    >
                      <div className="flex items-center gap-1.5 font-black text-xl italic tracking-tighter">
                        {pitch.current_alpha >= 0 ? "+" : ""}
                        {(pitch.current_alpha * 100).toFixed(2)}%
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Alpha Score</span>
                    </div>
                  </div>

                  <p className="text-gray-400 text-sm leading-relaxed font-medium mb-8 line-clamp-3">
                    {pitch.content_body}
                  </p>

                  <div className="pt-8 border-t border-white/5 space-y-6">
                    {pitch.deck_url && (
                      <div className="space-y-3">
                        <div className="text-[10px] uppercase font-black tracking-[0.2em] text-gray-500 ml-1">
                          Attached Deck
                        </div>
                        <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40 group-hover:border-yellow-400/20 transition-colors shadow-inner">
                          <PdfThumbnail url={pitch.deck_url} ticker={pitch.ticker} />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
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
                        className="flex items-center gap-3 bg-white text-black font-black py-3 px-8 rounded-xl shadow-xl hover:bg-yellow-400 transition-all uppercase tracking-widest text-xs italic"
                      >
                        View / Trade
                        <ExternalLink className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))
          )}
        </AnimatePresence>
      </motion.main>

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
