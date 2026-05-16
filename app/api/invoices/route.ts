import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/api-auth";

// GET /api/invoices
export async function GET() {
  const user = await getAuthUser();
  if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const invoices = await prisma.invoice.findMany({
    include: {
      order: {
        include: {
          customer: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
          orderItems: true,
        },
      },
    },
    orderBy: { generatedAt: "desc" },
  });

  return Response.json(invoices);
}
