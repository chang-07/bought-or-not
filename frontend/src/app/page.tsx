"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Lock, Mail, User as UserIcon, ArrowRight, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/login' : '/api/signup';
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const res = await axios.post(`${baseURL}${endpoint}`, formData, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.data.success) {
        if (!res.data.snaptrade_connected) {
          router.push('/onboarding');
        } else {
          router.push('/dashboard');
        }
      } else {
        setError(isLogin ? 'Invalid credentials' : 'Username already exists');
      }
    } catch (err: any) {
      setError('Connection error to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#09090b]">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[120px]" />

      <main className="w-full max-w-md p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-500/20 mb-6">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            VSPP
          </h1>
          <p className="text-gray-400">Verified Social Pitch Platform</p>
        </motion.div>

        <motion.div
          className="bg-[#18181b]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex p-1 bg-black/40 rounded-xl mb-8">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${isLogin ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${!isLogin ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="email"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative"
                >
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    placeholder="Email address"
                    required={!isLogin}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Username"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                placeholder="Password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-red-400 text-sm text-center font-medium"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-70"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 text-center flex items-center justify-center gap-2 text-gray-400 text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Bank-level encryption via SnapTrade</span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
