import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, ShieldCheck, CheckCircle2, TrendingUp, Activity, Target, ArrowRight, ChevronRight } from 'lucide-react';
import axios from 'axios';

type TradeModalProps = {
    isOpen: boolean;
    onClose: () => void;
    pitchId: number | null;
    ticker: string;
};

export default function TradeModal({ isOpen, onClose, pitchId, ticker }: TradeModalProps) {
    const [loadingImpact, setLoadingImpact] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [impactData, setImpactData] = useState<unknown>(null);
    const [isMarketOpen, setIsMarketOpen] = useState(true);
    const [accountId, setAccountId] = useState<string>('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const units = 1;

    useEffect(() => {
        if (isOpen && pitchId) {
            fetchImpact();
        } else {
            setImpactData(null);
            setError('');
            setSuccess('');
        }
    }, [isOpen, pitchId]);

    const fetchImpact = async () => {
        setLoadingImpact(true);
        setError('');

        try {
            const baseURL = '';
            const res = await axios.get(`${baseURL}/api/trade/impact/${pitchId}`, {
                withCredentials: true
            });

            if (res.data.success) {
                setImpactData(res.data.impact);
                setAccountId(res.data.account.id);
                setIsMarketOpen(res.data.is_market_open);
            } else {
                setError(res.data.error || 'Failed to calculate trade impact. Ensure SnapTrade is linked.');
            }
        } catch (err) {
            setError('Connection error evaluating trade impact.');
        } finally {
            setLoadingImpact(false);
        }
    };

    const handleExecute = async () => {
        setExecuting(true);
        setError('');

        try {
            const baseURL = '';
            const res = await axios.post(`${baseURL}/api/trade/execute/${pitchId}`, {
                account_id: accountId,
                units: units
            }, {
                withCredentials: true
            });

            if (res.data.success) {
                setSuccess('Trade executed successfully!');
                setTimeout(() => {
                    onClose();
                }, 3000);
            } else {
                setError(res.data.error || 'Failed to execute trade.');
            }
        } catch (err) {
            setError('Connection error during execution.');
        } finally {
            setExecuting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={!executing && !success ? onClose : undefined}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md bg-[#111114] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400" />
                        
                        <div className="p-10">
                            <div className="flex justify-between items-center mb-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-1 h-6 bg-yellow-400 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">
                                        Trade Terminal
                                    </h2>
                                </div>
                                {!executing && !success && (
                                    <button
                                        onClick={onClose}
                                        className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-500 hover:text-white"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                )}
                            </div>

                            <div className="space-y-8">
                                {success ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="py-12 text-center"
                                    >
                                        <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                                        </div>
                                        <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2 text-white">Order Filled</h3>
                                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
                                            Trade transmitted to exchange protocol
                                        </p>
                                    </motion.div>
                                ) : loadingImpact ? (
                                    <div className="flex flex-col items-center justify-center py-16">
                                        <div className="w-10 h-10 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mb-6" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 animate-pulse">Evaluating Transmission Impact...</p>
                                    </div>
                                ) : error ? (
                                    <motion.div 
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-red-400/5 border border-red-400/10 text-red-400 p-6 rounded-[1.5rem] flex items-start gap-4"
                                    >
                                        <AlertTriangle className="w-6 h-6 shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest mb-1">Warning: Protocol Error</p>
                                            <p className="text-xs font-medium leading-relaxed opacity-80">{error}</p>
                                        </div>
                                    </motion.div>
                                ) : impactData ? (
                                    <div className="space-y-8">
                                        {!isMarketOpen && (
                                            <div className="bg-yellow-400/5 border border-yellow-400/10 p-5 rounded-[1.5rem] flex items-start gap-4">
                                                <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-[10px] font-black text-yellow-500 mb-1 uppercase tracking-widest">Market is currently closed</p>
                                                    <p className="text-[10px] text-yellow-500/60 font-medium leading-relaxed uppercase tracking-wider">Order will be queued for next open.</p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-black/60 border border-white/5 rounded-[2rem] p-8 shadow-inner">
                                            <div className="flex items-center justify-between mb-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-yellow-400 p-3 rounded-2xl shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                                                        <TrendingUp className="w-6 h-6 text-black" strokeWidth={3} />
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Target Instrument</div>
                                                        <div className="text-2xl font-black italic tracking-tighter text-white">${ticker}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Accuracy</div>
                                                    <ShieldCheck className="w-5 h-5 text-yellow-400 ml-auto" />
                                                </div>
                                            </div>

                                            <div className="space-y-4 pt-6 border-t border-white/5">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Operation Type</span>
                                                    <span className="text-xs font-black text-emerald-400 italic">BUY {units} SHARE(S)</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Est. Strike Price</span>
                                                    <span className="text-xs font-black text-white italic">${(impactData as any).estimated_execution_price || 'MARKET'}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Intel Commission</span>
                                                    <span className="text-xs font-black text-white italic">${(impactData as any).estimated_commissions || '0.00'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <motion.button
                                                whileHover={{ scale: 1.02, x: 5 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={handleExecute}
                                                disabled={executing}
                                                className="group flex-1 bg-yellow-400 hover:bg-yellow-300 text-black font-black py-5 px-6 rounded-2xl shadow-xl shadow-yellow-400/10 transition-all disabled:opacity-50 uppercase italic tracking-widest text-sm flex items-center justify-center gap-3"
                                            >
                                                {executing ? (
                                                    <div className="w-6 h-6 border-3 border-black/20 border-t-black rounded-full animate-spin" />
                                                ) : (
                                                    <>
                                                        {isMarketOpen ? 'Confirm Order' : 'Queue Dispatch'}
                                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                                                    </>
                                                )}
                                            </motion.button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
