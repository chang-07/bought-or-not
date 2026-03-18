"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link as LinkIcon, Building2, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleConnect = async () => {
        setLoading(true);
        setError('');

        try {
            const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await axios.post(`${baseURL}/api/snaptrade/connect`, {}, {
                withCredentials: true, // Needs session cookies for Django Auth
            });

            if (res.data.redirect_url) {
                window.location.href = res.data.redirect_url;
            } else {
                setError(res.data.error || 'Failed to generate SnapTrade URL');
            }
        } catch (err: any) {
            setError('Connection error configuring brokerage.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#09090b]">
            <div className="absolute top-[0%] left-[20%] w-[600px] h-[600px] rounded-full bg-emerald-600/10 blur-[150px]" />

            <main className="w-full max-w-md p-6 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#18181b]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
                >
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-gradient-to-br from-emerald-500 to-teal-700 shadow-2xl shadow-emerald-500/20 mb-6">
                        <Building2 className="w-10 h-10 text-white" />
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-3">Connect Brokerage</h1>
                    <p className="text-gray-400 mb-8 text-sm">
                        To publish verified pitches or one-click copy trade, VSPP requires read/write access to your portfolio.
                    </p>

                    {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

                    <button
                        onClick={handleConnect}
                        disabled={loading}
                        className="group w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-4 px-6 rounded-xl shadow-lg transition-transform active:scale-[0.98] disabled:opacity-70 hover:bg-gray-100"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                            <>
                                <LinkIcon className="w-5 h-5" />
                                <span>Link via SnapTrade</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform ml-auto" />
                            </>
                        )}
                    </button>
                </motion.div>
            </main>
        </div>
    );
}
