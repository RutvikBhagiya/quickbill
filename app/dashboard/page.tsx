import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Package, Tag, AlertTriangle, TrendingUp, DollarSign, ShoppingCart, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

async function getDashboardData() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const allActiveProducts = await prisma.product.findMany({
    where: { isActive: true }, select: { stockQty: true, lowStockLimit: true },
  });
  const lowStockCount = allActiveProducts.filter((p) => p.stockQty <= p.lowStockLimit).length;

  const [revenueAgg, totalOrders, totalProducts, totalCategories, todayOrders, recentOrders, lowStockProducts] =
    await Promise.all([
      prisma.order.aggregate({ where: { status: "CONFIRMED" }, _sum: { totalAmount: true } }),
      prisma.order.count({ where: { status: "CONFIRMED" } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.category.count(),
      prisma.order.count({ where: { status: "CONFIRMED", createdAt: { gte: todayStart } } }),
      prisma.order.findMany({
        take: 5, orderBy: { createdAt: "desc" },
        include: { customer: { select: { name: true } }, orderItems: { select: { id: true } } },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true, sku: true, stockQty: true, lowStockLimit: true, category: { select: { name: true } } },
        orderBy: { stockQty: "asc" },
      }).then((list) => list.filter((p) => p.stockQty <= p.lowStockLimit).slice(0, 5)),
    ]);

  return { totalRevenue: Number(revenueAgg._sum.totalAmount ?? 0), totalOrders, totalProducts, totalCategories, lowStockCount, todayOrders, recentOrders, lowStockProducts };
}

const PM_LABELS: Record<string, string> = { CASH: "Cash", CARD: "Card", UPI: "UPI" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const d = await getDashboardData();

  const statCards = [
    { label: "Total Revenue", value: `₹${d.totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "from-violet-500 to-indigo-600", shadow: "shadow-violet-500/25", sub: `${d.totalOrders} confirmed orders` },
    { label: "Orders Today", value: d.todayOrders, icon: ShoppingCart, color: "from-emerald-500 to-teal-600", shadow: "shadow-emerald-500/25", sub: "Confirmed today" },
    { label: "Products", value: d.totalProducts, icon: Package, color: "from-sky-500 to-blue-600", shadow: "shadow-sky-500/25", sub: `${d.totalCategories} categories` },
    { label: "Low Stock", value: d.lowStockCount, icon: AlertTriangle, color: "from-amber-500 to-orange-600", shadow: "shadow-amber-500/25", sub: "Need restocking" },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome back, {user?.name} 👋</h1>
          <p className="text-gray-400 mt-1 text-sm">Here&apos;s what&apos;s happening in your store.</p>
        </div>
        <Link href="/dashboard/orders" className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium text-sm transition-colors">
          <ShoppingCart size={16} /> New Order
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map(({ label, value, icon: Icon, color, shadow, sub }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg ${shadow} shrink-0`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-gray-400 text-sm mt-0.5">{label}</p>
              <p className="text-gray-600 text-xs mt-1">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="xl:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <h2 className="text-white font-semibold">Recent Orders</h2>
            <Link href="/dashboard/orders" className="text-violet-400 hover:text-violet-300 text-sm transition-colors">View all →</Link>
          </div>
          {d.recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <ShoppingCart size={28} className="mb-2" />
              <p className="text-sm">No orders yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b border-gray-800">
                {["Order", "Customer", "Items", "Total", "Status"].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-800">
                {d.recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-6 py-3">
                      <span className="font-mono text-xs bg-gray-800 text-violet-300 px-2 py-1 rounded-lg">{o.orderNumber}</span>
                    </td>
                    <td className="px-6 py-3 text-gray-300 text-sm">{o.customer?.name ?? <span className="text-gray-500 italic">Guest</span>}</td>
                    <td className="px-6 py-3 text-gray-400 text-sm">{o.orderItems.length}</td>
                    <td className="px-6 py-3 text-white font-semibold text-sm">₹{Number(o.totalAmount).toFixed(2)}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${o.status === "CONFIRMED" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-red-500/15 text-red-300 border-red-500/30"}`}>
                        {o.status === "CONFIRMED" ? <CheckCircle size={10} /> : <XCircle size={10} />} {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" /> Low Stock
            </h2>
            <Link href="/dashboard/products" className="text-violet-400 hover:text-violet-300 text-sm transition-colors">View all →</Link>
          </div>
          {d.lowStockProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <TrendingUp size={28} className="mb-2 text-emerald-500" />
              <p className="text-sm text-emerald-400">All stock levels OK</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {d.lowStockProducts.map((p) => (
                <div key={p.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-800/40 transition-colors">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{p.name}</p>
                    <p className="text-gray-500 text-xs">{p.category.name}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className={`font-bold text-sm ${p.stockQty === 0 ? "text-red-400" : "text-amber-400"}`}>{p.stockQty}</p>
                    <p className="text-gray-600 text-xs">/ {p.lowStockLimit} min</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/dashboard/orders", label: "New Order", icon: ShoppingCart, color: "text-violet-400", adminOnly: false },
            { href: "/dashboard/products", label: "Products", icon: Package, color: "text-sky-400", adminOnly: false },
            { href: "/dashboard/categories", label: "Categories", icon: Tag, color: "text-emerald-400", adminOnly: true },
            { href: "/dashboard/reports", label: "Reports", icon: TrendingUp, color: "text-amber-400", adminOnly: true },
          ].map(({ href, label, icon: Icon, color, adminOnly }) => {
            if (adminOnly && user?.role !== "ADMIN") return null;
            return (
              <Link key={href} href={href} className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors group">
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="text-gray-300 group-hover:text-white text-sm font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}