import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/api-auth";

// GET /api/invoices/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const invoiceId = parseInt(id);
  if (isNaN(invoiceId)) return Response.json({ message: "Invalid ID" }, { status: 400 });

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      order: {
        include: {
          customer: true,
          user: { select: { id: true, name: true } },
          orderItems: { include: { product: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  if (!invoice) return Response.json({ message: "Invoice not found" }, { status: 404 });
  return Response.json(invoice);
}
