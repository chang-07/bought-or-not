"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link as LinkIcon, Building2, ArrowRight, ShieldCheck } from 'lucide-react';
import axios from 'axios';

export default function OnboardingPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleConnect = async () => {
        setLoading(true);
        setError('');

        try {
            const baseURL = '';
            const res = await axios.post(`${baseURL}/api/snaptrade/connect`, {}, {
                withCredentials: true,
            });

            if (res.data.redirect_url) {
                window.location.href = res.data.redirect_url;
            } else {
                setError(res.data.error || 'Failed to generate SnapTrade URL');
            }
        } catch (err: unknown) {
            setError('Connection error configuring brokerage.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#09090b]">
            <main className="w-full max-w-md p-8 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="bg-[#111114] border border-white/10 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400" />
                    
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2.5rem] bg-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.2)] mb-10 group">
                        <Building2 className="w-12 h-12 text-black transition-transform group-hover:scale-110" strokeWidth={2.5} />
                    </div>

                    <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-4 text-white">Initialize Node</h1>
                    <p className="text-gray-500 mb-10 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                        To publish verified intel or execute copy trades, VSPP requires a secure linkage to your exchange protocol.
                    </p>

                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-red-400 text-[10px] font-black uppercase tracking-widest mb-6 p-4 bg-red-400/5 border border-red-400/10 rounded-xl"
                        >
                            {error}
                        </motion.div>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleConnect}
                        disabled={loading}
                        className="group w-full flex items-center justify-center gap-3 bg-yellow-400 hover:bg-yellow-300 text-black font-black py-5 px-8 rounded-2xl shadow-xl shadow-yellow-400/10 transition-all disabled:opacity-50 uppercase italic tracking-widest text-sm"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-3 border-black/20 border-t-black rounded-full animate-spin" />
                        ) : (
                            <>
                                <LinkIcon className="w-5 h-5" strokeWidth={3} />
                                <span>Link Protocol</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform ml-auto" />
                            </>
                        )}
                    </motion.button>
                    
                    <div className="mt-8 flex items-center justify-center gap-2 text-[8px] font-black text-gray-700 uppercase tracking-[0.3em]">
                        <ShieldCheck className="w-3 h-3 text-yellow-500/50" />
                        SnapTrade Encrypted Pipeline
                    </div>
                </motion.div>
            </main>
            
        </div>
    );
}
