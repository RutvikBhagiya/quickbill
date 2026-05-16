"use client";

import { useState, useEffect } from "react";
import { BarChart2, Loader2, TrendingUp, ShoppingCart, DollarSign, Package, AlertTriangle, Download } from "lucide-react";

/* ─── Types ─── */
interface Overview {
  totalRevenue: number; avgOrderValue: number; totalOrders: number;
  cancelledOrders: number; todayOrders: number; yesterdayOrders: number;
  totalProducts: number; lowStockCount: number;
}
interface DayData { date: string; revenue: number; orders: number }
interface TopProduct { name: string; revenue: number; qty: number }
interface PaymentStat { method: string; count: number; revenue: number }
interface LowStockItem { id: number; name: string; sku: string; stockQty: number; lowStockLimit: number; category: { name: string } }
interface ReportData { overview: Overview; dailySales: DayData[]; topProducts: TopProduct[]; paymentStats: PaymentStat[]; lowStockProducts: LowStockItem[] }

/* ─── Bar Chart ─── */
function BarChart({ data }: { data: DayData[] }) {
  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex items-end gap-2 h-40 px-2">
      {data.map((d) => {
        const pct = (d.revenue / maxRev) * 100;
        const label = days[new Date(d.date + "T00:00:00").getDay()];
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="w-full relative flex items-end" style={{ height: "128px" }}>
              <div className="w-full rounded-t-lg bg-gradient-to-t from-violet-700 to-violet-500 transition-all duration-500 group-hover:from-violet-600 group-hover:to-violet-400"
                style={{ height: `${Math.max(pct, 2)}%` }} />
              {d.revenue > 0 && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-800 border border-gray-700 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap z-10">
                  ₹{d.revenue.toFixed(0)} · {d.orders} orders
                </div>
              )}
            </div>
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Donut Chart ─── */
const DONUT_COLORS = ["#8b5cf6", "#10b981", "#3b82f6"];
const PM_LABELS: Record<string, string> = { CASH: "Cash", CARD: "Card", UPI: "UPI" };

function DonutChart({ data }: { data: PaymentStat[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const r = 35;
  const circ = 2 * Math.PI * r;
  let cum = 0;

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="w-32 h-32 shrink-0" style={{ transform: "rotate(-90deg)" }}>
        {total === 0 ? (
          <circle cx="50" cy="50" r={r} fill="none" stroke="#374151" strokeWidth="15" />
        ) : (
          data.map((seg, i) => {
            const frac = seg.count / total;
            const dash = frac * circ;
            const offset = -(cum * circ);
            cum += frac;
            return (
              <circle key={i} cx="50" cy="50" r={r} fill="none"
                stroke={DONUT_COLORS[i % DONUT_COLORS.length]} strokeWidth="15"
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={offset}
              />
            );
          })
        )}
        <circle cx="50" cy="50" r="25" fill="#111827" />
      </svg>
      <div className="space-y-2 flex-1">
        {total === 0 ? (
          <p className="text-gray-500 text-sm">No data yet</p>
        ) : (
          data.map((seg, i) => (
            <div key={seg.method} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
              <span className="text-gray-300 text-sm flex-1">{PM_LABELS[seg.method] ?? seg.method}</span>
              <span className="text-white text-sm font-semibold">{seg.count}</span>
            </div>
          ))
        )}
        {total > 0 && <p className="text-gray-500 text-xs pt-1">Total {total} orders</p>}
      </div>
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({ label, value, sub, icon: Icon, color, shadow }: { label: string; value: string | number; sub?: string; icon: React.ElementType; color: string; shadow: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg ${shadow} shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-gray-400 text-sm">{label}</p>
        {sub && <p className="text-gray-600 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-40">
        <Loader2 className="animate-spin text-violet-400 w-10 h-10" />
      </div>
    );
  }

  if (!data) return <div className="p-8 text-red-400">Failed to load reports.</div>;

  const { overview, dailySales, topProducts, paymentStats, lowStockProducts } = data;
  const todayTrend = overview.yesterdayOrders > 0
    ? ((overview.todayOrders - overview.yesterdayOrders) / overview.yesterdayOrders * 100).toFixed(0)
    : null;
  const maxProductRevenue = Math.max(...topProducts.map((p) => p.revenue), 1);

  function handleExport(type: "sales" | "stock") {
    window.location.href = `/api/reports/export?type=${type}`;
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart2 className="text-violet-400" size={28} /> Reports & Analytics
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Business performance overview</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => handleExport("sales")} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-xl font-medium text-sm transition-colors">
            <Download size={16} /> Sales Report
          </button>
          <button onClick={() => handleExport("stock")} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium text-sm transition-colors">
            <Download size={16} /> Stock Report
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`₹${overview.totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          sub={`${overview.totalOrders} orders`} icon={DollarSign} color="from-violet-500 to-indigo-600" shadow="shadow-violet-500/25" />
        <StatCard label="Avg Order Value" value={`₹${overview.avgOrderValue.toFixed(2)}`}
          sub="Per confirmed order" icon={TrendingUp} color="from-emerald-500 to-teal-600" shadow="shadow-emerald-500/25" />
        <StatCard label="Orders Today" value={overview.todayOrders}
          sub={todayTrend ? `${Number(todayTrend) >= 0 ? "+" : ""}${todayTrend}% vs yesterday` : "No orders yesterday"}
          icon={ShoppingCart} color="from-sky-500 to-blue-600" shadow="shadow-sky-500/25" />
        <StatCard label="Low Stock Items" value={overview.lowStockCount}
          sub={`${overview.totalProducts} active products`} icon={AlertTriangle} color="from-amber-500 to-orange-600" shadow="shadow-amber-500/25" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Daily Sales Bar Chart */}
        <div className="xl:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-semibold">Daily Revenue — Last 7 Days</h2>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-violet-500" />
              <span className="text-gray-400 text-xs">Revenue</span>
            </div>
          </div>
          {dailySales.every((d) => d.revenue === 0) ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-600">
              <BarChart2 size={32} className="mb-2" />
              <p className="text-sm">No sales in the last 7 days</p>
            </div>
          ) : (
            <BarChart data={dailySales} />
          )}
        </div>

        {/* Payment Breakdown Donut */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-6">Payment Methods</h2>
          <DonutChart data={paymentStats} />
          {paymentStats.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-800 space-y-2">
              {paymentStats.map((s) => (
                <div key={s.method} className="flex justify-between text-sm">
                  <span className="text-gray-400">{PM_LABELS[s.method] ?? s.method}</span>
                  <span className="text-white font-medium">₹{s.revenue.toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-5">Top Products by Revenue</h2>
          {topProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-600">
              <Package size={28} className="mb-2" />
              <p className="text-sm">No sales data yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topProducts.map((p, i) => (
                <div key={p.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-gray-600 text-xs font-mono w-4 shrink-0">#{i + 1}</span>
                      <span className="text-gray-300 text-sm truncate">{p.name}</span>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className="text-white font-semibold text-sm">₹{p.revenue.toFixed(0)}</span>
                      <span className="text-gray-500 text-xs ml-2">{p.qty} sold</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-700"
                      style={{ width: `${(p.revenue / maxProductRevenue) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" />
            <h2 className="text-white font-semibold">Low Stock Alerts</h2>
          </div>
          {lowStockProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <TrendingUp size={28} className="text-emerald-500 mb-2" />
              <p className="text-emerald-400 font-medium text-sm">All stock levels are OK</p>
            </div>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b border-gray-800">
                {["Product", "Category", "Stock", "Min"].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-800">
                {lowStockProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-6 py-3">
                      <p className="text-white text-sm font-medium">{p.name}</p>
                      <p className="text-gray-500 text-xs font-mono">{p.sku}</p>
                    </td>
                    <td className="px-6 py-3 text-gray-400 text-sm">{p.category.name}</td>
                    <td className="px-6 py-3">
                      <span className={`font-bold text-sm ${p.stockQty === 0 ? "text-red-400" : "text-amber-400"}`}>
                        {p.stockQty === 0 ? "OUT" : p.stockQty}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-500 text-sm">{p.lowStockLimit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Order Stats Summary */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">Order Summary</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Confirmed", value: overview.totalOrders, color: "text-emerald-400" },
            { label: "Cancelled", value: overview.cancelledOrders, color: "text-red-400" },
            { label: "Success Rate", value: overview.totalOrders + overview.cancelledOrders === 0 ? "—" : `${((overview.totalOrders / (overview.totalOrders + overview.cancelledOrders)) * 100).toFixed(1)}%`, color: "text-violet-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center bg-gray-800 rounded-xl p-4">
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              <p className="text-gray-400 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
