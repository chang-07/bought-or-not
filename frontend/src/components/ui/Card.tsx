"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { ReactNode } from "react";

export interface CardProps extends HTMLMotionProps<"article"> {
  children: ReactNode;
}

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <motion.article
      {...props}
      className={`group bg-[#111114]/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] overflow-hidden hover:border-yellow-400/30 transition-all shadow-2xl relative ${className}`}
    >
      {children}
    </motion.article>
  );
}
