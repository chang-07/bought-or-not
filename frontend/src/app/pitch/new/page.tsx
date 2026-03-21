"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileUp, AlertCircle, RefreshCw, ChevronRight, ShieldCheck } from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";

type StockSearchResult = {
  id: string;
  ticker: string;
  name: string;
  label: string;
};

export default function NewPitchPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    ticker: "",
    targetPrice: "",
    contentBody: "",
  });

  const [file, setFile] = useState<File | null>(null);

  // Typeahead state
  const [suggestions, setSuggestions] = useState<StockSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const tickerInputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const router = useRouter();

  const normalizedTicker = useMemo(
    () => formData.ticker.trim().toUpperCase(),
    [formData.ticker],
  );

  useEffect(() => {
    const q = normalizedTicker;

    if (!q) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearching(false);
      setHighlightedIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const baseURL = "";
        const res = await axios.get(`${baseURL}/api/stocks/search`, {
          params: { q },
          withCredentials: true,
        });

        if (res.data?.success) {
          const results: StockSearchResult[] = Array.isArray(res.data.results)
            ? res.data.results
            : [];
          setSuggestions(results);
          setShowSuggestions(true);
          setHighlightedIndex(results.length > 0 ? 0 : -1);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
          setHighlightedIndex(-1);
        }
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [normalizedTicker]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        tickerInputRef.current &&
        !tickerInputRef.current.contains(target)
      ) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selectSuggestion = (item: StockSearchResult) => {
    setFormData((prev) => ({ ...prev, ticker: item.ticker.toUpperCase() }));
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    tickerInputRef.current?.focus();
  };

  const onTickerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Escape") {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev <= 0 ? suggestions.length - 1 : prev - 1,
      );
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        selectSuggestion(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!file) {
      setError("A Pitch Deck (PDF or PPTX) is required.");
      setLoading(false);
      return;
    }

    try {
      const baseURL = "";
      const payload = new FormData();
      payload.append(
        "payload",
        JSON.stringify({
          ticker: formData.ticker.trim().toUpperCase(),
          target_price: parseFloat(formData.targetPrice),
          content_body: formData.contentBody,
        }),
      );
      payload.append("deck", file);

      const res = await axios.post(`${baseURL}/api/pitches`, payload, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        setSuccess("Transmission successful. Awaiting protocol verification...");
        setTimeout(() => router.push("/dashboard"), 2000);
      } else {
        setError(res.data.error || "Broadcast failure");
      }
    } catch {
      setError("Ulink connection terminated.");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1, y: 0,
      transition: { duration: 0.6, staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen p-6 relative overflow-hidden">
      <div className="absolute top-[5%] right-[-5%] w-[400px] h-[400px] rounded-full bg-yellow-400/5 blur-[120px] pointer-events-none" />

      <motion.main 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="max-w-3xl mx-auto relative z-10 py-16"
      >
        <motion.div variants={itemVariants} className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1.5 h-8 bg-yellow-400 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">
              Dispatch Intel
            </h1>
          </div>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] ml-1">
            Submit research for instant cross-exchange verification
          </p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-[#111114]/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full blur-3xl pointer-events-none" />
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3 relative">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                  Asset Identifier (Ticker)
                </label>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-yellow-400/70 font-black italic">
                    $
                  </div>
                  <input
                    ref={tickerInputRef}
                    type="text"
                    placeholder="AAPL"
                    required
                    maxLength={20}
                    autoComplete="off"
                    value={formData.ticker}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ticker: e.target.value.toUpperCase(),
                      })
                    }
                    onFocus={() => {
                      if (suggestions.length > 0) setShowSuggestions(true);
                    }}
                    onKeyDown={onTickerKeyDown}
                    className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 pl-10 pr-10 text-white font-bold placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all uppercase"
                  />
                  {searching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {showSuggestions && (
                    <motion.div
                      ref={dropdownRef}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-30 mt-2 w-full bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl max-h-64 overflow-y-auto backdrop-blur-xl"
                    >
                      {suggestions.length === 0 ? (
                        <div className="px-5 py-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                          No protocol matches
                        </div>
                      ) : (
                        suggestions.map((item, idx) => (
                          <button
                            key={`${item.id}-${item.ticker}-${idx}`}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectSuggestion(item);
                            }}
                            className={`w-full text-left px-5 py-4 border-b border-white/5 last:border-b-0 transition-all ${
                              idx === highlightedIndex
                                ? "bg-yellow-400 text-black"
                                : "hover:bg-white/5"
                            }`}
                          >
                            <div className={`text-sm font-black italic ${idx === highlightedIndex ? "text-black" : "text-white"}`}>
                              {item.ticker}
                            </div>
                            <div className={`text-[9px] font-bold uppercase tracking-wider truncate ${idx === highlightedIndex ? "text-black/70" : "text-gray-500"}`}>
                              {item.name || "Unknown entity"}
                            </div>
                          </button>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                  Target Price Vector
                </label>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-yellow-400/70 font-black italic">
                    $
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    required
                    value={formData.targetPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, targetPrice: e.target.value })
                    }
                    className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-white font-bold placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                Executive Intelligence Summary (Markdown)
              </label>
              <textarea
                required
                rows={6}
                placeholder="Detail the thesis and convictions..."
                value={formData.contentBody}
                onChange={(e) =>
                  setFormData({ ...formData, contentBody: e.target.value })
                }
                className="w-full bg-black/60 border border-white/10 rounded-2xl py-5 px-6 text-white font-medium placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                Intelligence Artifact (Deck)
              </label>
              <motion.div 
                whileHover={{ borderColor: "rgba(250, 204, 21, 0.4)" }}
                className="border-2 border-dashed border-white/10 rounded-[2rem] bg-black/40 hover:bg-black/60 transition-all p-12 flex flex-col items-center justify-center relative cursor-pointer"
              >
                <input
                  type="file"
                  accept=".pdf,.pptx"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setFile(e.target.files[0]);
                    }
                  }}
                />

                <AnimatePresence mode="wait">
                  {file ? (
                    <motion.div 
                      key="file"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center text-yellow-400"
                    >
                      <div className="bg-yellow-400 p-4 rounded-2xl mb-4 shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                        <FileUp className="w-8 h-8 text-black" />
                      </div>
                      <p className="font-black text-xs uppercase tracking-widest text-center truncate max-w-[250px]">
                        {file.name}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="no-file"
                      className="flex flex-col items-center text-gray-600"
                    >
                      <FileUp className="w-10 h-10 mb-5 text-gray-700 opacity-50" />
                      <p className="font-black text-[10px] uppercase tracking-[0.2em]">
                        Click to upload Intel artifact
                      </p>
                      <p className="text-[9px] font-bold text-gray-700 mt-2 uppercase">
                        PDF / PPTX / MAX 10MB
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 text-red-400 bg-red-400/5 p-5 rounded-2xl border border-red-400/10 text-xs font-black uppercase tracking-widest"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 text-emerald-400 bg-emerald-400/5 p-5 rounded-2xl border border-emerald-400/10 text-xs font-black uppercase tracking-widest"
              >
                <RefreshCw className="w-5 h-5 animate-spin shrink-0" />
                <p>{success}</p>
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02, x: 5 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || !!success}
              className="group relative w-full flex items-center justify-center gap-4 bg-yellow-400 hover:bg-yellow-300 text-black font-black py-5 px-6 rounded-2xl shadow-2xl shadow-yellow-400/10 transition-all disabled:opacity-50 mt-10 h-16 uppercase italic tracking-widest text-sm"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-black/20 border-t-black rounded-full animate-spin" />
              ) : success ? (
                <span>Transmission Active</span>
              ) : (
                <>
                  <span>Initialize Broadcast</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </>
              )}
            </motion.button>

            <div className="text-center text-[9px] text-gray-600 font-black uppercase tracking-[0.2em] flex justify-center items-center gap-3 pt-4">
              <ShieldCheck className="w-4 h-4 text-yellow-400/50" />
              Node verification will trigger upon submission
            </div>
          </form>
        </motion.div>
      </motion.main>
    </div>
  );
}
