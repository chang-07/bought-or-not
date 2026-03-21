"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

export function StatCard({ 
  label, 
  value, 
  icon, 
  trend,
  className = ""
}: { 
  label: string; 
  value: string | number; 
  icon: React.ReactNode;
  trend?: "up" | "down";
  className?: string;
}) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={`bg-[#111114] border border-white/5 p-8 rounded-[2rem] relative overflow-hidden group ${className}`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 blur-[50px] rounded-full -mr-16 -mt-16 group-hover:bg-yellow-400/10 transition-colors" />
      
      <div className="flex items-center justify-between mb-6">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 group-hover:text-yellow-400 transition-colors">
          {label}
        </div>
        <div className="text-gray-600 group-hover:text-yellow-400 transition-colors">
          {icon}
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <div className="text-3xl font-black italic tracking-tighter text-white">
          {value}
        </div>
        {trend && (
          <div className={`p-1.5 rounded-lg ${trend === 'up' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-rose-400/10 text-rose-400'}`}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
        )}
      </div>
    </motion.div>
  );
}
