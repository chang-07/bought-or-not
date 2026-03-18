import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
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
    const [impactData, setImpactData] = useState<any>(null);
    const [isMarketOpen, setIsMarketOpen] = useState(true);
    const [accountId, setAccountId] = useState<string>('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // For demo simplicity, we fix units at 1 share, but this could be a state variable
    const units = 1;

    useEffect(() => {
        if (isOpen && pitchId) {
            fetchImpact();
        } else {
            // Reset state on close
            setImpactData(null);
            setError('');
            setSuccess('');
        }
    }, [isOpen, pitchId]);

    const fetchImpact = async () => {
        setLoadingImpact(true);
        setError('');

        try {
            const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
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
            const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
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
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={!executing && !success ? onClose : undefined}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    />
                    <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-[#18181b] border border-white/10 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <div>
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        Execute Trade <span className="text-blue-400">${ticker}</span>
                                    </h2>
                                </div>
                                {!executing && !success && (
                                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                        <X className="w-5 h-5 text-gray-400" />
                                    </button>
                                )}
                            </div>

                            <div className="p-6 overflow-y-auto">
                                {success ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-4" />
                                        <h3 className="text-2xl font-bold text-white mb-2">Order Confirmed</h3>
                                        <p className="text-gray-400">Your order has been sent to your brokerage.</p>
                                    </div>
                                ) : loadingImpact ? (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
                                        <p className="text-sm font-medium text-gray-400 animate-pulse">Running Pre-Trade Impact Checks...</p>
                                    </div>
                                ) : error ? (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                                        <p className="text-sm leading-relaxed">{error}</p>
                                    </div>
                                ) : impactData ? (
                                    <div className="space-y-6">
                                        {!isMarketOpen && (
                                            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
                                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-semibold text-amber-500 mb-1">Market is currently closed.</p>
                                                    <p className="text-xs text-amber-500/80">Placing this Market Order will queue it for execution at the next market open.</p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-black/40 rounded-xl p-5 border border-white/5">
                                            <h4 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4" /> Simulated Order Impact
                                            </h4>

                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-400">Action</span>
                                                    <span className="font-medium text-emerald-400">BUY {units} Share(s)</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-400">Estimated Price (per share)</span>
                                                    <span className="font-medium">${impactData.estimated_execution_price || 'Market'}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-400">Estimated Commissions</span>
                                                    <span className="font-medium">${impactData.estimated_commissions || '0.00'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            {!success && impactData && !error && (
                                <div className="p-6 border-t border-white/10 bg-black/20 flex gap-3">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleExecute}
                                        disabled={executing}
                                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold flex justify-center items-center shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
                                    >
                                        {executing ? (
                                            <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            isMarketOpen ? 'Confirm Trade' : 'Queue Order'
                                        )}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
