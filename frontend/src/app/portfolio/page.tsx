"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, AlertTriangle, TrendingDown, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

type Holding = {
    symbol: string;
    units: number;
    price: number;
};

type Account = {
    account_id: string;
    account_name: string;
    holdings: Holding[];
};

export default function PortfolioPage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sellState, setSellState] = useState<{ symbol: string | null, status: string }>({ symbol: null, status: 'idle' });

    useEffect(() => {
        fetchPortfolio();
    }, []);

    const fetchPortfolio = async () => {
        setLoading(true);
        try {
            const baseURL = '';
            const res = await axios.get(`${baseURL}/api/portfolio`, {
                withCredentials: true
            });
            if (res.data.success) {
                // Parse SnapTrade holdings into uniform format
                const parsedAccounts = res.data.portfolio.map((acc: any) => {
                    let parsedHoldings: Holding[] = [];
                    const hData = acc.holdings;
                    if (Array.isArray(hData)) {
                        parsedHoldings = hData.map(h => {
                            const symbol = h.symbol?.symbol || h.symbol || 'UNK';
                            const units = h.units || 0;
                            const price = h.price || 0;
                            return { symbol, units, price };
                        });
                    } else if (hData && typeof hData === 'object' && hData.positions) {
                        parsedHoldings = hData.positions.map((p: any) => {
                            const symbol = p.symbol?.symbol || p.symbol || 'UNK';
                            const units = p.units || 0;
                            const price = p.price || 0;
                            return { symbol, units, price };
                        });
                    }
                    return {
                        account_id: acc.account_id,
                        account_name: acc.account_name,
                        holdings: parsedHoldings.filter(h => h.units > 0 && h.symbol !== 'UNK')
                    };
                });
                setAccounts(parsedAccounts);
            } else {
                setError(res.data.error || 'Failed to fetch portfolio data.');
            }
        } catch (err) {
            console.error(err);
            setError('Connection error or unaunthenticated.');
        } finally {
            setLoading(false);
        }
    };

    const handleSell = async (accountId: string, symbol: string, units: number) => {
        setSellState({ symbol, status: 'loading' });
        try {
            const baseURL = '';
            const res = await axios.post(`${baseURL}/api/trade/sell`, {
                account_id: accountId,
                symbol,
                units
            }, {
                withCredentials: true
            });

            if (res.data.success) {
                setSellState({ symbol, status: 'success' });
                // Refresh portfolio after 3 seconds
                setTimeout(() => {
                    setSellState({ symbol: null, status: 'idle' });
                    fetchPortfolio();
                }, 3000);
            } else {
                setSellState({ symbol, status: 'error' });
                alert(res.data.error || 'Failed to sell.');
            }
        } catch (err) {
            setSellState({ symbol, status: 'error' });
            alert('Connection error during sell execution.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] flex justify-center items-center">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#09090b] flex flex-col justify-center items-center text-white p-6 text-center">
                <AlertTriangle className="w-16 h-16 text-rose-500 mb-4" />
                <h2 className="text-2xl font-bold">Unable to Load Portfolio</h2>
                <p className="text-gray-400 mt-2 max-w-md">{error}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-white p-6 relative">
            {/* Background Glow */}
            <div className="fixed top-[-10%] left-[50%] -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-blue-600/5 blur-[150px] pointer-events-none" />

            <div className="max-w-4xl mx-auto mb-10 relative z-10 pt-6">
                <header className="mb-10">
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Briefcase className="w-8 h-8 text-blue-500" />
                        My Portfolio
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Manage your SnapTrade synced holdings and close out copied pitches.</p>
                </header>

                <main className="space-y-8">
                    {accounts.length === 0 ? (
                        <div className="text-center p-12 bg-white/5 rounded-2xl border border-white/10">
                            <p className="text-gray-400">No brokerage accounts found. Please link one on the connection portal.</p>
                        </div>
                    ) : (
                        accounts.map(account => (
                            <div key={account.account_id} className="bg-[#18181b]/80 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                                <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
                                    <h2 className="text-xl font-bold">{account.account_name}</h2>
                                    <span className="text-xs text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full uppercase tracking-wider font-semibold border border-blue-500/20">Synced</span>
                                </div>
                                <div className="p-0">
                                    {account.holdings.length === 0 ? (
                                        <div className="p-6 text-center text-gray-500 text-sm">No tradable equity positions found in this account.</div>
                                    ) : (
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-white/5 bg-black/20 text-xs uppercase tracking-wider text-gray-400">
                                                    <th className="p-4 font-semibold">Symbol</th>
                                                    <th className="p-4 font-semibold">Shares</th>
                                                    <th className="p-4 font-semibold">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {account.holdings.map((h, i) => (
                                                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                                        <td className="p-4">
                                                            <div className="font-bold text-lg text-white">${h.symbol}</div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="text-gray-300">{h.units.toFixed(4)}</div>
                                                        </td>
                                                        <td className="p-4">
                                                            {sellState.symbol === h.symbol && sellState.status === 'success' ? (
                                                                <span className="flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-lg w-fit">
                                                                    <CheckCircle2 className="w-4 h-4" /> Ordered
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleSell(account.account_id, h.symbol, h.units)}
                                                                    disabled={sellState.symbol === h.symbol && sellState.status === 'loading'}
                                                                    className="flex items-center gap-2 bg-rose-500/20 hover:bg-rose-500 hover:text-white border border-rose-500/50 text-rose-400 font-medium py-1.5 px-4 rounded-xl transition-all disabled:opacity-50"
                                                                >
                                                                    {sellState.symbol === h.symbol && sellState.status === 'loading' ? (
                                                                        <div className="w-4 h-4 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
                                                                    ) : (
                                                                        <>Sell Position <TrendingDown className="w-4 h-4" /></>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </main>
            </div>
        </div>
    );
}
