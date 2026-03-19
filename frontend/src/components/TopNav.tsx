"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Briefcase,
  PlusSquare,
  TrendingUp,
  BarChart3,
} from "lucide-react";

export default function TopNav() {
  const pathname = usePathname();

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
    <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#09090b]/60 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="bg-gradient-to-tr from-blue-700 to-blue-500 p-1.5 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.5)] group-hover:shadow-[0_0_25px_rgba(59,130,246,0.7)] transition-all">
              <TrendingUp className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-blue-400 transition-colors">
              VSPP
            </span>
          </Link>

          {/* Navigation Buttons */}
          <div className="flex space-x-2 sm:space-x-4">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`
                                        flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-300
                                        ${
                                          isActive
                                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                                            : "text-gray-400 hover:text-white hover:bg-white/5"
                                        }
                                    `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{link.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
