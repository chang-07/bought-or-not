"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Download, FileText, ChevronRight, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

// Configure worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfThumbnailProps {
  url: string;
  ticker: string;
}

export default function PdfThumbnail({ url, ticker }: PdfThumbnailProps) {
  const [numPages, setNumPages] = useState<number>();

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${ticker}_Pitch_Deck.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative group cursor-pointer overflow-hidden bg-black/40 border border-white/5 group-hover:border-yellow-400/30 transition-all duration-500 rounded-2xl" 
      onClick={handleDownload}
    >
      <div className="flex justify-center items-center h-[350px] sm:h-[420px] overflow-hidden transition-all duration-700 group-hover:scale-[1.05] group-hover:blur-[2px]">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 animate-pulse">Establishing Intel Feed...</span>
            </div>
          }
          error={
            <div className="text-center p-12 grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
              <FileText className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Artifact Preview Unavailable</p>
              <p className="text-[9px] font-bold text-yellow-400/50 mt-2 uppercase tracking-wider">Click for Direct Access</p>
            </div>
          }
        >
          <Page
            pageNumber={1}
            height={420}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            className="max-w-full h-auto object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
          />
        </Document>
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
