"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Download } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfThumbnailProps {
  url: string;
  ticker: string;
}

export default function PdfThumbnail({ url, ticker }: PdfThumbnailProps) {
  const [numPages, setNumPages] = useState<number>();

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      download={`${ticker}_pitch.pdf`}
      className="block relative group overflow-hidden bg-white/5 rounded-xl border border-white/10 hover:border-blue-500/50 transition-colors cursor-pointer"
    >
      <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur-md text-white p-2.5 rounded-xl border border-white/20 flex items-center gap-2 text-sm font-semibold shadow-xl">
        <Download className="w-4 h-4" />
        Download Pitch
      </div>
      <div className="flex justify-center items-center h-[350px] sm:h-[420px] overflow-hidden bg-black/20">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="h-full flex flex-col items-center justify-center text-sm text-gray-400 gap-3">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
              Loading preview...
            </div>
          }
          error={
            <div className="p-10 flex flex-col items-center justify-center text-center text-sm text-gray-400">
              <div className="mb-2 text-white/50 bg-white/5 p-4 rounded-full">
                <Download className="w-6 h-6" />
              </div>
              Preview not available natively. <br />
              <span className="text-blue-400 font-medium mt-1">
                Click to download deck directly
              </span>
            </div>
          }
        >
          <Page
            pageNumber={1}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            height={420}
            className="shadow-2xl"
          />
        </Document>
      </div>
    </a>
  );
}
