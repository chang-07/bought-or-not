"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileUp, Send, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function NewPitchPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        ticker: '',
        targetPrice: '',
        contentBody: ''
    });
    const [file, setFile] = useState<File | null>(null);

    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        if (!file) {
            setError("A Pitch Deck (PDF or PPTX) is required.");
            setLoading(false);
            return;
        }

        try {
            const baseURL = '';

            const payload = new FormData();
            payload.append("payload", JSON.stringify({
                ticker: formData.ticker,
                target_price: parseFloat(formData.targetPrice),
                content_body: formData.contentBody
            }));
            payload.append("deck", file);

            const res = await axios.post(`${baseURL}/api/pitches`, payload, {
                withCredentials: true,
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (res.data.success) {
                setSuccess('Pitch submitted perfectly. Verification in progress!');
                setTimeout(() => router.push('/dashboard'), 2000);
            } else {
                setError(res.data.error || 'Failed to submit pitch');
            }
        } catch (err: any) {
            setError('Connection error or unauthorized.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-white p-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[150px] pointer-events-none" />

            <main className="max-w-3xl mx-auto relative z-10 py-12">
                <div className="mb-10 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-500/20 mb-6">
                        <TrendingUp className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight mb-3">Draft a Pitch</h1>
                    <p className="text-gray-400 max-w-lg mx-auto">
                        Submit your research. Once you post, VSPP automatically verifies your "Skin in the Game" via SnapTrade.
                    </p>
                </div>

                <motion.div
                    className="bg-[#18181b]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300 ml-1">Ticker Symbol</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</div>
                                    <input
                                        type="text"
                                        placeholder="AAPL"
                                        required
                                        maxLength={10}
                                        value={formData.ticker}
                                        onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300 ml-1">Target Price</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="250.00"
                                        required
                                        value={formData.targetPrice}
                                        onChange={(e) => setFormData({ ...formData, targetPrice: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 ml-1">Executive Summary (Markdown supported)</label>
                            <textarea
                                required
                                rows={5}
                                placeholder="Why is this a high conviction trade? Provide your thesis here..."
                                value={formData.contentBody}
                                onChange={(e) => setFormData({ ...formData, contentBody: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 ml-1">Attach Pitch Deck</label>
                            <div className="border-2 border-dashed border-white/10 rounded-2xl bg-black/20 hover:bg-black/40 transition-colors p-8 flex flex-col items-center justify-center relative cursor-pointer">
                                <input
                                    type="file"
                                    accept=".pdf,.pptx"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files.length > 0) {
                                            setFile(e.target.files[0]);
                                        }
                                    }}
                                />

                                {file ? (
                                    <div className="flex flex-col items-center text-emerald-400">
                                        <FileUp className="w-10 h-10 mb-2" />
                                        <p className="font-medium text-sm text-center truncate max-w-[200px]">
                                            {file.name}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-gray-400">
                                        <FileUp className="w-10 h-10 mb-3 text-gray-500" />
                                        <p className="font-medium text-sm">Click or drag file to upload</p>
                                        <p className="text-xs text-gray-500 mt-1">PDF or PPTX up to 10MB</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-4 rounded-xl text-sm font-medium">
                                <AlertCircle className="w-5 h-5" />
                                <p>{error}</p>
                            </div>
                        )}

                        {success && (
                            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 p-4 rounded-xl text-sm font-medium">
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                <p>{success}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !!success}
                            className="group relative w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-4 px-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:scale-100 mt-6"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : success ? (
                                <span>Published!</span>
                            ) : (
                                <>
                                    <span>Submit for Verification</span>
                                    <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                        <p className="text-center text-xs text-gray-500 flex justify-center items-center gap-1.5 pt-2">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Your Snapshot brokerage connection will be pinged instantly.
                        </p>
                    </form>
                </motion.div>
            </main>
        </div>
    );
}
