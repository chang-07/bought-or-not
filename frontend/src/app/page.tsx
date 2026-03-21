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
      const baseURL = '';

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
    } catch {
      setError('Connection error to server.');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-yellow-400/10 blur-[150px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-yellow-600/5 blur-[150px]" />

      <motion.main 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-md p-6 relative z-10"
      >
        <motion.div
          variants={itemVariants}
          className="text-center mb-10"
        >
          <motion.div 
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.8, ease: "anticipate" }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.3)] mb-6"
          >
            <TrendingUp className="w-10 h-10 text-black" strokeWidth={3} />
          </motion.div>
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2 italic">
            Bought-or-Not
          </h1>
          <p className="text-gray-400 font-medium tracking-wide uppercase text-xs">Verified Social Pitch Platform</p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-[#18181b]/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />
          
          <div className="flex p-1.5 bg-black/50 rounded-2xl mb-10 border border-white/5">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${isLogin ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'text-gray-500 hover:text-white'
                }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${!isLogin ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'text-gray-500 hover:text-white'
                }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="email"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative"
                >
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    placeholder="Email address"
                    required={!isLogin}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all font-medium"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Username"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all font-medium"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="password"
                placeholder="Password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all font-medium"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="text-red-400 text-xs text-center font-bold uppercase tracking-wider bg-red-400/10 py-2 rounded-lg"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="group relative w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold py-4 px-4 rounded-2xl shadow-xl shadow-yellow-400/20 transition-all disabled:opacity-70 mt-4 h-14"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <span className="uppercase tracking-widest text-sm">{isLogin ? 'Access Portal' : 'Initialize Account'}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                </>
              )}
            </motion.button>
          </form>

          <motion.div 
            variants={itemVariants}
            className="mt-8 pt-8 border-t border-white/5 text-center flex items-center justify-center gap-3 text-gray-500 text-[10px] font-bold uppercase tracking-widest"
          >
            <ShieldCheck className="w-4 h-4 text-yellow-400" />
            <span>Encrypted via SnapTrade Protocol</span>
          </motion.div>
        </motion.div>
      </motion.main>
    </div>
  );
}
