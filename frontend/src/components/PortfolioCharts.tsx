"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts";
import { TrendingUp, PieChart as PieIcon, BarChart3 } from "lucide-react";

type Position = {
  ticker: string;
  units: number;
  price: number;
  average_purchase_price: number;
  open_pnl: number;
};

type PortfolioChartsProps = {
  positions: Position[];
  totalMarketValue: number;
  totalCash: number;
  snapshots?: { date: string; value: number }[];
};

const CHART_COLORS = [
  "#facc15", // yellow-400
  "#a78bfa", // violet-400
  "#34d399", // emerald-400
  "#f87171", // red-400
  "#60a5fa", // blue-400
  "#fb923c", // orange-400
  "#e879f9", // fuchsia-400
  "#2dd4bf", // teal-400
  "#fbbf24", // amber-400
  "#818cf8", // indigo-400
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
};

// Custom tooltip for area chart
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ValueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111114] border border-white/10 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">
        {label}
      </p>
      <p className="text-sm font-black italic text-yellow-400">
        ${payload[0].value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </p>
    </div>
  );
}

// Custom tooltip for bar chart
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PnlTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="bg-[#111114] border border-white/10 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">
        {payload[0].payload.ticker}
      </p>
      <p className={`text-sm font-black italic ${val >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
        {val >= 0 ? "+" : ""}${val.toFixed(2)}
      </p>
    </div>
  );
}

export default function PortfolioCharts({
  positions,
  totalMarketValue,
  totalCash,
  snapshots = [],
}: PortfolioChartsProps) {
  // --- Allocation data (pie chart) ---
  const allocationData = useMemo(() => {
    const posData = positions
      .map((p) => ({
        name: p.ticker,
        value: Math.max(p.units * p.price, 0),
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);

    if (totalCash > 0) {
      posData.push({ name: "Cash", value: totalCash });
    }

    return posData;
  }, [positions, totalCash]);

  // --- P&L data (bar chart) ---
  const pnlData = useMemo(() => {
    return positions
      .filter((p) => p.ticker !== "UNK" && p.units > 0)
      .map((p) => ({
        ticker: p.ticker,
        pnl: p.open_pnl,
        fill: p.open_pnl >= 0 ? "#34d399" : "#f87171",
      }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [positions]);

  // --- Real portfolio value timeline from backend snapshots ---
  const valueTimeline = useMemo(() => {
    const totalValue = totalMarketValue + totalCash;
    if (totalValue <= 0) return [];

    const data = [...snapshots].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    ).map(snap => ({
      ...snap,
      // Format as Dec 14 for the X axis
      date: new Date(snap.date).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      value: Math.round(snap.value * 100) / 100,
    }));

    // Append today's live value to the end if the snapshots don't end on exactly today
    const todayLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (data.length === 0 || data[data.length - 1].date !== todayLabel) {
      data.push({
        date: todayLabel,
        value: totalValue,
      });
    } else {
      // Overwrite today's snapshot with live fluctuating value
      data[data.length - 1].value = totalValue;
    }

    return data;
  }, [snapshots, totalMarketValue, totalCash]);

  if (positions.length === 0) return null;

  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
    >
      {/* ---- Portfolio Value Over Time ---- */}
      <motion.div
        variants={itemVariants}
        className="lg:col-span-2 bg-[#111114] border border-white/5 rounded-[2rem] p-8 relative overflow-hidden group"
      >
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-yellow-400/50 via-yellow-400/20 to-transparent" />
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-yellow-400/10 rounded-xl border border-yellow-400/20">
            <TrendingUp className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase italic tracking-tighter text-white">
              Portfolio Value
            </h3>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-600">
              30-day performance timeline
            </p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-2xl font-black italic tracking-tighter text-white">
              ${(totalMarketValue + totalCash).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[9px] font-black uppercase tracking-widest text-gray-600">
              Total Value
            </div>
          </div>
        </div>

        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={valueTimeline} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#facc15" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#facc15" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.03)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fill: "#555", fontWeight: 900 }}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fill: "#555", fontWeight: 900 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                width={50}
              />
              <Tooltip content={<ValueTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#facc15"
                strokeWidth={2.5}
                fill="url(#valueGradient)"
                animationDuration={2000}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ---- Asset Allocation Donut ---- */}
      <motion.div
        variants={itemVariants}
        className="bg-[#111114] border border-white/5 rounded-[2rem] p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-violet-400/50 via-violet-400/20 to-transparent" />
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-violet-400/10 rounded-xl border border-violet-400/20">
            <PieIcon className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase italic tracking-tighter text-white">
              Allocation
            </h3>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-600">
              Asset distribution by value
            </p>
          </div>
        </div>

        <div className="h-[240px] flex items-center">
          <div className="w-1/2 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  animationBegin={300}
                  animationDuration={1500}
                  animationEasing="ease-out"
                  stroke="none"
                >
                  {allocationData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-1/2 space-y-2 pl-2">
            {allocationData.slice(0, 7).map((item, idx) => {
              const pct = totalMarketValue + totalCash > 0
                ? ((item.value / (totalMarketValue + totalCash)) * 100).toFixed(1)
                : "0";
              return (
                <div key={item.name} className="flex items-center gap-2 group">
                  <div
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                  />
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider truncate group-hover:text-white transition-colors">
                    {item.name}
                  </span>
                  <span className="text-[10px] font-black text-white italic ml-auto">
                    {pct}%
                  </span>
                </div>
              );
            })}
            {allocationData.length > 7 && (
              <div className="text-[9px] font-black text-gray-700 uppercase tracking-widest">
                +{allocationData.length - 7} more
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ---- Position P&L Breakdown ---- */}
      <motion.div
        variants={itemVariants}
        className="bg-[#111114] border border-white/5 rounded-[2rem] p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-400/50 via-emerald-400/20 to-transparent" />
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-emerald-400/10 rounded-xl border border-emerald-400/20">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase italic tracking-tighter text-white">
              P&L Breakdown
            </h3>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-600">
              Unrealized gain/loss per position
            </p>
          </div>
        </div>

        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={pnlData}
              layout="vertical"
              margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.03)"
                horizontal={false}
              />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fill: "#555", fontWeight: 900 }}
                tickFormatter={(v) => `$${v >= 0 ? "+" : ""}${v.toFixed(0)}`}
              />
              <YAxis
                type="category"
                dataKey="ticker"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#aaa", fontWeight: 900, fontStyle: "italic" }}
                width={55}
              />
              <Tooltip content={<PnlTooltip />} />
              <ReferenceLine x={0} stroke="rgba(255,255,255,0.1)" />
              <Bar
                dataKey="pnl"
                radius={[0, 6, 6, 0]}
                animationDuration={1500}
                animationEasing="ease-out"
              >
                {pnlData.map((entry, index) => (
                  <Cell key={`pnl-${index}`} fill={entry.fill} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.section>
  );
}
