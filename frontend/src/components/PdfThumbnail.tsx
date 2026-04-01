"use client";

import { Download, ChevronRight, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

interface PdfThumbnailProps {
  url: string;
  ticker: string;
}

export default function PdfThumbnail({ url, ticker }: PdfThumbnailProps) {
  const absoluteUrl = url.startsWith('/') 
    ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${url}`
    : url;

  const handleDownload = () => {
    // Rely on the browser's native PDF viewer in a new tab for seamless access
    window.open(absoluteUrl, '_blank');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative group cursor-pointer overflow-hidden bg-black/40 border border-white/5 group-hover:border-yellow-400/30 transition-all duration-500 rounded-2xl" 
      onClick={handleDownload}
    >
      <div className="flex justify-center items-center h-[350px] sm:h-[420px] overflow-hidden transition-all duration-700 bg-zinc-900/50">
        <div className="w-full h-full pointer-events-none group-hover:scale-[1.05] group-hover:blur-[2px] transition-all duration-700 opacity-90">
          {/* Native HTML5 Iframe bypasses all Canvas parsing bugs and guarantees a preview */}
          <iframe 
            src={`${absoluteUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} 
            className="w-full h-full border-none pointer-events-none"
            title={`${ticker} Pitch Deck Preview`}
          />
        </div>
      </div>

      {/* Tactical UI Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-8">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          whileHover={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="bg-yellow-400 p-3 rounded-2xl shadow-[0_0_20px_rgba(250,204,21,0.4)]">
              <Download className="w-5 h-5 text-black" strokeWidth={3} />
            </div>
            <div>
              <div className="text-[11px] font-black text-white uppercase tracking-widest leading-none mb-1.5">Download Pitch Deck</div>
              <div className="text-[9px] font-black text-yellow-400/70 uppercase tracking-[0.2em] leading-none flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" /> Encrypted PDF Artifact
              </div>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-yellow-400 animate-pulse" />
        </motion.div>
      </div>
      
      {/* Grid Pattern Overlay Subtle */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </motion.div>
  );
}
