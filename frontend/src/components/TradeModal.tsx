import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, ShieldCheck, CheckCircle2, TrendingUp, ChevronRight, Minus, Plus } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';

type TradeModalProps = {
    isOpen: boolean;
    onClose: () => void;
    pitchId: number | null;
    ticker: string;
};

type Step = 'quantity' | 'evaluating' | 'review' | 'success' | 'error';

type ImpactData = {
    estimated_execution_price: number | null;
    estimated_commissions: number;
    trade_id: string;
};

export default function TradeModal({ isOpen, onClose, pitchId, ticker }: TradeModalProps) {
    const [step, setStep] = useState<Step>('quantity');
    const [units, setUnits] = useState(1);
    const [executing, setExecuting] = useState(false);
    const [impactData, setImpactData] = useState<ImpactData | null>(null);
    const [isMarketOpen, setIsMarketOpen] = useState(true);
    const [accountId, setAccountId] = useState('');
    const [error, setError] = useState('');

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setStep('quantity');
            setUnits(1);
            setImpactData(null);
            setError('');
            setExecuting(false);
        }
    }, [isOpen, pitchId]);

    const fetchImpact = async () => {
        setStep('evaluating');
        setError('');

        try {
            const res = await api.get(`/api/trade/impact/${pitchId}`);

            if (res.data.success) {
                setImpactData(res.data.impact);
                setAccountId(res.data.account.id);
                setIsMarketOpen(res.data.is_market_open);
                setStep('review');
            } else {
                setError(res.data.error || 'Failed to calculate trade impact. Ensure SnapTrade is linked.');
                setStep('error');
            }
        } catch {
            setError('Connection error evaluating trade impact.');
            setStep('error');
        }
    };

    const handleExecute = async () => {
        setExecuting(true);
        setError('');

        try {
            const res = await api.post(`/api/trade/execute/${pitchId}`, {
                account_id: accountId,
                units: units
            });

            if (res.data.success) {
                setStep('success');
                setTimeout(() => {
                    onClose();
                }, 3000);
            } else {
                setError(res.data.error || 'Failed to execute trade.');
                setStep('error');
            }
        } catch {
            setError('Connection error during execution.');
            setStep('error');
        } finally {
            setExecuting(false);
        }
    };

    const canClose = !executing && step !== 'success';

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={canClose ? onClose : undefined}
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
                            {/* Header */}
                            <div className="flex justify-between items-center mb-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-1 h-6 bg-yellow-400 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">
                                        Trade Terminal
                                    </h2>
                                </div>
                                {canClose && (
                                    <button
                                        onClick={onClose}
                                        className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-500 hover:text-white"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                )}
                            </div>

                            {/* Step Progress */}
                            <div className="flex items-center gap-2 mb-8">
                                {(['quantity', 'review', 'success'] as const).map((s, i) => (
                                    <div key={s} className="flex items-center gap-2 flex-1">
                                        <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                                            (s === 'quantity' && step !== 'quantity') || 
                                            (s === 'review' && (step === 'success')) ||
                                            step === s
                                                ? 'bg-yellow-400'
                                                : 'bg-white/5'
                                        }`} />
                                        {i < 2 && <div className="w-1" />}
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-8">
                                <AnimatePresence mode="wait">
                                    {/* ===== STEP 1: Quantity Selection ===== */}
                                    {step === 'quantity' && (
                                        <motion.div
                                            key="quantity"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="space-y-8"
                                        >
                                            {/* Ticker Display */}
                                            <div className="bg-black/60 border border-white/5 rounded-[2rem] p-8 shadow-inner">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="bg-yellow-400 p-3 rounded-2xl shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                                                        <TrendingUp className="w-6 h-6 text-black" strokeWidth={3} />
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Target Instrument</div>
                                                        <div className="text-2xl font-black italic tracking-tighter text-white">${ticker}</div>
                                                    </div>
                                                </div>

                                                {/* Quantity Picker */}
                                                <div className="pt-6 border-t border-white/5">
                                                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">
                                                        Select Quantity
                                                    </div>
                                                    <div className="flex items-center justify-center gap-6">
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => setUnits(Math.max(1, units - 1))}
                                                            disabled={units <= 1}
                                                            className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-yellow-400/30 transition-all disabled:opacity-30 disabled:hover:bg-white/5"
                                                        >
                                                            <Minus className="w-5 h-5 text-gray-400" />
                                                        </motion.button>

                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                max={9999}
                                                                value={units}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value);
                                                                    if (!isNaN(val) && val >= 1 && val <= 9999) setUnits(val);
                                                                }}
                                                                className="w-28 text-center bg-black/60 border border-white/10 rounded-2xl py-4 text-3xl font-black italic tracking-tighter text-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                            <div className="absolute -bottom-6 left-0 right-0 text-center text-[9px] font-black text-gray-600 uppercase tracking-widest">
                                                                Share{units !== 1 ? 's' : ''}
                                                            </div>
                                                        </div>

                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => setUnits(Math.min(9999, units + 1))}
                                                            className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-yellow-400/30 transition-all"
                                                        >
                                                            <Plus className="w-5 h-5 text-gray-400" />
                                                        </motion.button>
                                                    </div>

                                                    {/* Quick select buttons */}
                                                    <div className="flex gap-2 mt-8 justify-center">
                                                        {[1, 5, 10, 25, 100].map((q) => (
                                                            <motion.button
                                                                key={q}
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => setUnits(q)}
                                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                                                    units === q
                                                                        ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30'
                                                                        : 'bg-white/5 text-gray-500 border-white/5 hover:border-white/20 hover:text-white'
                                                                }`}
                                                            >
                                                                {q}
                                                            </motion.button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Evaluate Button */}
                                            <Button
                                                onClick={fetchImpact}
                                                className="w-full"
                                            >
                                                Evaluate {units} Share{units !== 1 ? 's' : ''}
                                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                                            </Button>
                                        </motion.div>
                                    )}

                                    {/* ===== STEP 2: Evaluating (Loading) ===== */}
                                    {step === 'evaluating' && (
                                        <motion.div
                                            key="evaluating"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="flex flex-col items-center justify-center py-16"
                                        >
                                            <div className="w-10 h-10 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mb-6" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 animate-pulse">
                                                Evaluating {units} share{units !== 1 ? 's' : ''} of ${ticker}...
                                            </p>
                                        </motion.div>
                                    )}

                                    {/* ===== ERROR ===== */}
                                    {step === 'error' && (
                                        <motion.div
                                            key="error"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="space-y-6"
                                        >
                                            <div className="bg-red-400/5 border border-red-400/10 text-red-400 p-6 rounded-[1.5rem] flex items-start gap-4">
                                                <AlertTriangle className="w-6 h-6 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1">Warning: Protocol Error</p>
                                                    <p className="text-xs font-medium leading-relaxed opacity-80">{error}</p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                onClick={() => setStep('quantity')}
                                                className="w-full mt-4"
                                            >
                                                Back to Quantity
                                            </Button>
                                        </motion.div>
                                    )}

                                    {/* ===== STEP 3: Review & Confirm ===== */}
                                    {step === 'review' && impactData && (
                                        <motion.div
                                            key="review"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-8"
                                        >
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
                                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Verified</div>
                                                        <ShieldCheck className="w-5 h-5 text-yellow-400 ml-auto" />
                                                    </div>
                                                </div>

                                                <div className="space-y-4 pt-6 border-t border-white/5">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Operation Type</span>
                                                        <span className="text-xs font-black text-emerald-400 italic">BUY {units} SHARE{units !== 1 ? 'S' : ''}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Est. Strike Price</span>
                                                        <span className="text-xs font-black text-white italic">${impactData.estimated_execution_price || 'MARKET'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Intel Commission</span>
                                                        <span className="text-xs font-black text-white italic">${impactData.estimated_commissions || '0.00'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-3">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => setStep('quantity')}
                                                    disabled={executing}
                                                >
                                                    Back
                                                </Button>
                                                <Button
                                                    onClick={handleExecute}
                                                    disabled={executing}
                                                    className="flex-1"
                                                >
                                                    {executing ? (
                                                        <div className="w-6 h-6 border-3 border-black/20 border-t-black rounded-full animate-spin" />
                                                    ) : (
                                                        <>
                                                            {isMarketOpen ? 'Confirm Order' : 'Queue Dispatch'}
                                                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* ===== SUCCESS ===== */}
                                    {step === 'success' && (
                                        <motion.div
                                            key="success"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="py-12 text-center"
                                        >
                                            <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                                            </div>
                                            <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2 text-white">Order Filled</h3>
                                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
                                                {units} share{units !== 1 ? 's' : ''} of ${ticker} transmitted to exchange
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
