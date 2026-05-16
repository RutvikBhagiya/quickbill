import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/api-auth";

// GET /api/orders/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const orderId = parseInt(id);
  if (isNaN(orderId)) return Response.json({ message: "Invalid ID" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      user: { select: { id: true, name: true } },
      orderItems: { include: { product: { select: { id: true, name: true } } } },
      invoice: true,
    },
  });

  if (!order) return Response.json({ message: "Order not found" }, { status: 404 });
  return Response.json(order);
}

// PATCH /api/orders/[id] — cancel order with stock rollback
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return Response.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const orderId = parseInt(id);
  if (isNaN(orderId)) return Response.json({ message: "Invalid ID" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { orderItems: true },
  });

  if (!order) return Response.json({ message: "Order not found" }, { status: 404 });
  if (order.status === "CANCELLED") {
    return Response.json({ message: "Order is already cancelled" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
      });

      for (const item of order.orderItems) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;
        const newStock = product.stockQty + item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: newStock },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "CANCEL",
            quantity: item.quantity,
            previousStock: product.stockQty,
            newStock,
            note: `Cancellation — Order ${order.orderNumber}`,
            createdBy: user.id,
          },
        });
      }
    });

    return Response.json({ message: "Order cancelled and stock restored" });
  } catch {
    return Response.json({ message: "Cancellation failed" }, { status: 500 });
  }
}
