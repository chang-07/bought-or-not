"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Eye, ShieldCheck, Clock, ExternalLink, Award, Target, Activity } from 'lucide-react';
import axios from 'axios';
import { useParams } from 'next/navigation';
import TradeModal from '@/components/TradeModal';

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

export default function AuthorProfilePage() {
    const params = useParams();
    const username = params.username as string;

    const [authorData, setAuthorData] = useState<any>(null);
    const [pitches, setPitches] = useState<Pitch[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPitch, setSelectedPitch] = useState<{ id: number, ticker: string } | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const res = await axios.get(`${baseURL}/api/author/${username}`, {
                    withCredentials: true
                });
                if (res.data.author) {
                    setAuthorData(res.data.author);
                    setPitches(res.data.pitches);
                }
            } catch (err) {
                console.error("Failed to fetch author profile", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [username]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] flex justify-center items-center">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!authorData) {
        return (
            <div className="min-h-screen bg-[#09090b] flex flex-col justify-center items-center text-white">
                <h2 className="text-2xl font-bold">Author Not Found</h2>
                <p className="text-gray-400 mt-2">The user you are looking for does not exist.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-white p-6 relative">
            {/* Background Glow */}
            <div className="fixed top-[-10%] left-[50%] -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-blue-600/5 blur-[150px] pointer-events-none" />

            <header className="max-w-4xl mx-auto mb-10 relative z-10 pt-6">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-3xl font-bold shadow-xl">
                        {username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">@{username}</h1>
                        <p className="text-emerald-400 text-sm mt-1 font-medium flex items-center gap-1">
                            <ShieldCheck className="w-4 h-4" /> Verified Mastermind
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-[#18181b]/80 border border-white/10 p-5 rounded-2xl flex flex-col justify-center">
                        <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-400" /> AUM Driven
                        </div>
                        <div className="text-3xl font-bold">${authorData.total_aum.toLocaleString()}</div>
                    </div>
                    <div className="bg-[#18181b]/80 border border-white/10 p-5 rounded-2xl flex flex-col justify-center">
                        <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Target className="w-4 h-4 text-emerald-400" /> Win Rate
                        </div>
                        <div className="text-3xl font-bold text-emerald-400">{authorData.win_rate.toFixed(1)}%</div>
                    </div>
                    <div className="bg-[#18181b]/80 border border-white/10 p-5 rounded-2xl flex flex-col justify-center">
                        <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-400" /> Avg Alpha
                        </div>
                        <div className="text-3xl font-bold text-blue-400">{(authorData.avg_alpha * 100).toFixed(2)}%</div>
                    </div>
                    <div className="bg-[#18181b]/80 border border-white/10 p-5 rounded-2xl flex flex-col justify-center">
                        <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Total Pitches</div>
                        <div className="text-3xl font-bold text-gray-200">{authorData.total_pitches}</div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto space-y-6 relative z-10 pb-20">
                <h2 className="text-xl font-bold mb-4">Investment Pitches</h2>

                {pitches.length === 0 ? (
                    <div className="text-center p-12 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-gray-400">This author hasn't posted any pitches yet.</p>
                    </div>
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
                                            <div className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                Target: ${pitch.target_price.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`flex flex-col items-end ${pitch.current_alpha >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        <div className="flex items-center gap-1 font-semibold text-lg">
                                            {pitch.current_alpha >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                            {(pitch.current_alpha * 100).toFixed(2)}%
                                        </div>
                                        <span className="text-xs opacity-70">Alpha vs SPY</span>
                                    </div>
                                </div>

                                <p className="text-gray-300 text-sm leading-relaxed mb-6 line-clamp-3">
                                    {pitch.content_body}
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                    <div className="flex gap-3">
                                        {pitch.deck_url && (
                                            <a
                                                href={pitch.deck_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg"
                                            >
                                                <Eye className="w-4 h-4" />
                                                View Deck
                                            </a>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => {
                                            setSelectedPitch({ id: pitch.id, ticker: pitch.ticker });
                                            setIsModalOpen(true);
                                        }}
                                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-2 px-5 rounded-xl shadow-lg transition-all active:scale-[0.98]"
                                    >
                                        1-Click Trade
                                        <ExternalLink className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.article>
                    ))
                )}
            </main>

            <TradeModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedPitch(null);
                }}
                pitchId={selectedPitch?.id || null}
                ticker={selectedPitch?.ticker || ''}
            />
        </div>
    );
}
