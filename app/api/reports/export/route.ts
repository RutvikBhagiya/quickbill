import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/api-auth";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "ADMIN") {
    return new Response("Unauthorized", { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") || "sales"; // 'sales' or 'stock'
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");

  let dateFilter = {};
  if (startDateStr && endDateStr) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);
    dateFilter = {
      createdAt: {
        gte: start,
        lte: end,
      },
    };
  }

  if (type === "sales") {
    const orders = await prisma.order.findMany({
      where: {
        status: "CONFIRMED",
        ...dateFilter,
      },
      include: {
        customer: true,
        user: true,
        orderItems: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "Order Number",
      "Date",
      "Time",
      "Customer Name",
      "Customer Phone",
      "Served By",
      "Payment Method",
      "Total Items",
      "Subtotal",
      "Discount",
      "Tax",
      "Grand Total",
    ];

    const rows = orders.map((o) => {
      const dateObj = new Date(o.createdAt);
      return [
        o.orderNumber,
        `="${dateObj.toISOString().slice(0, 10)}"`, // Force text in Excel
        `="${dateObj.toISOString().slice(11, 19)}"`, // Force text in Excel
        o.customer?.name || "Guest",
        o.customer?.phone || "",
        o.user.name,
        o.paymentMethod,
        o.orderItems.reduce((acc, item) => acc + item.quantity, 0).toString(),
        Number(o.subtotal).toFixed(2),
        Number(o.discount).toFixed(2),
        Number(o.tax).toFixed(2),
        Number(o.totalAmount).toFixed(2),
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => {
        if (typeof cell === "string" && cell.startsWith("=")) return cell;
        return `"${cell}"`;
      }).join(",")),
    ].join("\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="sales_report_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } else if (type === "stock") {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { stockQty: "asc" },
    });

    const headers = [
      "Product Name",
      "SKU",
      "Category",
      "Price",
      "Cost Price",
      "Stock Quantity",
      "Low Stock Limit",
      "Status",
    ];

    const rows = products.map((p) => [
      p.name,
      p.sku,
      p.category.name,
      Number(p.price).toFixed(2),
      p.costPrice ? Number(p.costPrice).toFixed(2) : "",
      p.stockQty.toString(),
      p.lowStockLimit.toString(),
      p.stockQty <= p.lowStockLimit ? (p.stockQty === 0 ? "Out of Stock" : "Low Stock") : "In Stock",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="stock_report_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return new Response("Invalid type", { status: 400 });
}
