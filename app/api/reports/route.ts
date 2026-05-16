import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/api-auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return Response.json({ message: "Forbidden" }, { status: 403 });

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

  // ── Overview ──
  const [revenueAgg, totalOrders, cancelledOrders, todayOrders, yesterdayOrders, totalProducts, allActiveProducts] =
    await Promise.all([
      prisma.order.aggregate({ where: { status: "CONFIRMED" }, _sum: { totalAmount: true }, _avg: { totalAmount: true } }),
      prisma.order.count({ where: { status: "CONFIRMED" } }),
      prisma.order.count({ where: { status: "CANCELLED" } }),
      prisma.order.count({ where: { status: "CONFIRMED", createdAt: { gte: todayStart } } }),
      prisma.order.count({ where: { status: "CONFIRMED", createdAt: { gte: yesterdayStart, lt: todayStart } } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.findMany({ where: { isActive: true }, select: { stockQty: true, lowStockLimit: true } }),
    ]);

  const lowStockCount = allActiveProducts.filter((p) => p.stockQty <= p.lowStockLimit).length;

  // ── Daily sales last 7 days ──
  const recentOrders = await prisma.order.findMany({
    where: { status: "CONFIRMED", createdAt: { gte: sevenDaysAgo } },
    select: { createdAt: true, totalAmount: true },
  });
  const salesMap = new Map<string, { revenue: number; orders: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    salesMap.set(d.toISOString().slice(0, 10), { revenue: 0, orders: 0 });
  }
  for (const o of recentOrders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    if (salesMap.has(key)) {
      const cur = salesMap.get(key)!;
      salesMap.set(key, { revenue: cur.revenue + Number(o.totalAmount), orders: cur.orders + 1 });
    }
  }
  const dailySales = [...salesMap.entries()].map(([date, v]) => ({ date, ...v }));

  // ── Top products ──
  const allItems = await prisma.orderItem.findMany({
    where: { order: { status: "CONFIRMED" } },
    select: { productName: true, quantity: true, total: true },
  });
  const productMap = new Map<string, { revenue: number; qty: number }>();
  for (const item of allItems) {
    const prev = productMap.get(item.productName) ?? { revenue: 0, qty: 0 };
    productMap.set(item.productName, { revenue: prev.revenue + Number(item.total), qty: prev.qty + item.quantity });
  }
  const topProducts = [...productMap.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([name, v]) => ({ name, ...v }));

  // ── Payment breakdown ──
  const paymentGroups = await prisma.order.groupBy({
    by: ["paymentMethod"],
    where: { status: "CONFIRMED" },
    _count: { _all: true },
    _sum: { totalAmount: true },
  });
  const paymentStats = paymentGroups.map((g) => ({
    method: g.paymentMethod,
    count: g._count._all,
    revenue: Number(g._sum.totalAmount ?? 0),
  }));

  // ── Low stock products ──
  const lowStockProducts = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, sku: true, stockQty: true, lowStockLimit: true, category: { select: { name: true } } },
    orderBy: { stockQty: "asc" },
  }).then((list) => list.filter((p) => p.stockQty <= p.lowStockLimit).slice(0, 10));

  // ── Recent orders ──
  const latestOrders = await prisma.order.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { name: true } }, orderItems: { select: { id: true } } },
  });

  return Response.json({
    overview: {
      totalRevenue: Number(revenueAgg._sum.totalAmount ?? 0),
      avgOrderValue: Number(revenueAgg._avg.totalAmount ?? 0),
      totalOrders,
      cancelledOrders,
      todayOrders,
      yesterdayOrders,
      totalProducts,
      lowStockCount,
    },
    dailySales,
    topProducts,
    paymentStats,
    lowStockProducts,
    latestOrders: latestOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentMethod: o.paymentMethod,
      totalAmount: Number(o.totalAmount),
      itemCount: o.orderItems.length,
      customerName: o.customer?.name ?? null,
      createdAt: o.createdAt.toISOString(),
    })),
  });
}
