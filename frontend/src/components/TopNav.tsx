"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import api from "@/lib/api";
import { motion } from "framer-motion";
import {
  Home,
  Briefcase,
  PlusSquare,
  TrendingUp,
  BarChart3,
  LogOut,
} from "lucide-react";

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await api.post("/api/logout");
    } catch (err) {
      console.error("Secure logout proxy failed:", err);
    } finally {
      window.location.href = "/";
    }
  };

  // Hide component seamlessly on public onboarding paths
  if (pathname === "/" || pathname === "/onboarding") {
    return null;
  }

  const navLinks = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Post Pitch", href: "/pitch/new", icon: PlusSquare },
    { name: "My Pitches", href: "/my/pitches", icon: BarChart3 },
    { name: "My Portfolio", href: "/portfolio", icon: Briefcase },
  ];

  return (
    <nav className="sticky top-0 z-[60] w-full border-b border-white/[0.03] bg-[#09090b]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo - Tactical Version */}
          <Link href="/dashboard" className="flex items-center gap-4 group">
            <motion.div 
              whileHover={{ rotate: 90, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300, damping: 10 }}
              className="relative w-10 h-10 flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-yellow-400 rounded-xl rotate-45 group-hover:rotate-0 transition-transform duration-500 shadow-[0_0_20px_rgba(250,204,21,0.3)]" />
              <TrendingUp className="w-5 h-5 text-black relative z-10" strokeWidth={3} />
            </motion.div>
            <div className="flex flex-col -space-y-1">
              <span className="font-black text-2xl italic tracking-tighter text-white group-hover:text-yellow-400 transition-colors uppercase">
                Bought-or-Not
              </span>
              <span className="text-[8px] font-black tracking-[0.4em] text-gray-600 uppercase">Deployed v3.4</span>
            </div>
          </Link>

          {/* Navigation Buttons - Tactical High-Performance */}
          <div className="flex items-center gap-2">
            {navLinks.map((link, idx) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className="relative group"
                >
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`
                      flex items-center gap-2.5 px-5 py-2.5 rounded-xl transition-all duration-300 relative overflow-hidden
                      ${
                        isActive
                          ? "text-yellow-400"
                          : "text-gray-500 hover:text-white"
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'stroke-[3px]' : 'stroke-2'}`} />
                    <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest italic">{link.name}</span>
                    
                    {isActive && (
                      <motion.div
                        layoutId="nav-glow"
                        className="absolute inset-0 bg-yellow-400/[0.03] -z-10"
                      />
                    )}
                    
                    {isActive && (
                      <motion.div 
                        layoutId="nav-indicator"
                        className="absolute bottom-0 left-4 right-4 h-0.5 bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)] rounded-full"
                      />
                    )}
                  </motion.div>
                </Link>
              );
            })}
            
            {/* Secure Logout Sequence */}
            <div className="pl-4 ml-4 border-l border-white/5">
              <button
                onClick={handleLogout}
                className="relative group"
              >
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl transition-all duration-300 relative overflow-hidden text-rose-500/80 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20"
                >
                  <LogOut className="w-4 h-4 transition-transform group-hover:scale-110 stroke-2" />
                  <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest italic">Abort Sync</span>
                </motion.div>
              </button>
            </div>
            
          </div>
        </div>
      </div>
    </nav>
  );
}
