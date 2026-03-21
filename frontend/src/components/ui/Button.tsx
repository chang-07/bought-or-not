"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { ReactNode } from "react";

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  children: ReactNode;
}

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  const base = "flex items-center justify-center gap-3 font-black py-4 px-8 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs italic disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-yellow-400 text-black shadow-yellow-400/10 hover:bg-yellow-300",
    secondary: "bg-white text-black hover:bg-gray-200",
    danger: "bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20",
    ghost: "border border-white/10 text-gray-500 hover:text-yellow-400 hover:border-yellow-400/30 hover:bg-yellow-400/5"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
