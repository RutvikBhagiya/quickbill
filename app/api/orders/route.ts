import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/api-auth";
import { type NextRequest } from "next/server";

function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `QB-${y}${m}${d}-${rand}`;
}

// GET /api/orders
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const status = request.nextUrl.searchParams.get("status");

  const orders = await prisma.order.findMany({
    where: status ? { status: status as "CONFIRMED" | "CANCELLED" } : {},
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      user: { select: { id: true, name: true } },
      orderItems: true,
      invoice: { select: { id: true, invoiceNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(orders);
}

// POST /api/orders — create order with full transaction
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    items,         // [{ productId, quantity, price }]
    paymentMethod, // CASH | CARD | UPI
    discount = 0,
    tax = 0,
    customerName,
    customerPhone,
  } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return Response.json({ message: "Order must have at least one item" }, { status: 400 });
  }
  if (!["CASH", "CARD", "UPI"].includes(paymentMethod)) {
    return Response.json({ message: "Invalid payment method" }, { status: 400 });
  }

  // Resolve customer
  let customerId: number | null = null;
  if (customerName?.trim()) {
    let customer = null;
    if (customerPhone?.trim()) {
      customer = await prisma.customer.findFirst({ where: { phone: customerPhone.trim() } });
    }
    if (!customer) {
      customer = await prisma.customer.create({
        data: { name: customerName.trim(), phone: customerPhone?.trim() || null },
      });
    }
    customerId = customer.id;
  }

  // Generate unique order number
  let orderNumber = generateOrderNumber();
  while (await prisma.order.findUnique({ where: { orderNumber } })) {
    orderNumber = generateOrderNumber();
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const subtotal = items.reduce(
        (sum: number, item: { quantity: number; price: number }) =>
          sum + item.quantity * item.price,
        0
      );
      const totalAmount = subtotal + tax - discount;

      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          userId: user.id,
          subtotal,
          tax,
          discount,
          totalAmount,
          paymentMethod,
          status: "CONFIRMED",
        },
      });

      // Process each item
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product || !product.isActive) {
          throw new Error(`Product ID ${item.productId} not found`);
        }
        if (product.stockQty < item.quantity) {
          throw new Error(`Insufficient stock for "${product.name}" (available: ${product.stockQty})`);
        }

        const newStock = product.stockQty - item.quantity;

        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: product.id,
            productName: product.name,
            quantity: item.quantity,
            price: item.price,
            total: item.quantity * item.price,
          },
        });

        await tx.product.update({
          where: { id: product.id },
          data: { stockQty: newStock },
        });

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: "SALE",
            quantity: item.quantity,
            previousStock: product.stockQty,
            newStock,
            note: `Sale — Order ${orderNumber}`,
            createdBy: user.id,
          },
        });
      }

      // Auto-create invoice
      await tx.invoice.create({
        data: {
          invoiceNumber: `INV-${orderNumber}`,
          orderId: newOrder.id,
        },
      });

      return newOrder;
    });

    const full = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        customer: true,
        orderItems: true,
        invoice: true,
        user: { select: { name: true } },
      },
    });

    return Response.json(full, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Order creation failed";
    return Response.json({ message: msg }, { status: 400 });
  }
}
