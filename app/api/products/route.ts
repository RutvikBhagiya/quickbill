import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { type NextRequest } from "next/server";

async function getAuthUser() {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

// GET /api/products — list with optional search/filter
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") ?? "";
  const categoryId = searchParams.get("categoryId");
  const lowStock = searchParams.get("lowStock") === "true";

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { sku: { contains: search } },
            ],
          }
        : {}),
      ...(categoryId ? { categoryId: parseInt(categoryId) } : {}),
      ...(lowStock
        ? {
            stockQty: { lte: 5 },
          }
        : {}),
    },
    include: {
      category: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });

  return Response.json(products);
}

// POST /api/products — create
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN")
    return Response.json({ message: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const {
    name,
    sku,
    barcode,
    description,
    price,
    costPrice,
    stockQty,
    lowStockLimit,
    categoryId,
  } = body;

  if (!name || !sku || price === undefined || !categoryId) {
    return Response.json(
      { message: "name, sku, price, and categoryId are required" },
      { status: 400 }
    );
  }

  const parsedPrice = parseFloat(price);
  if (parsedPrice < 0) {
    return Response.json({ message: "Price cannot be negative" }, { status: 400 });
  }

  const parsedStock = parseInt(stockQty) || 0;
  if (parsedStock < 0) {
    return Response.json({ message: "Stock cannot be negative" }, { status: 400 });
  }

  const [skuExists, nameExists] = await Promise.all([
    prisma.product.findUnique({ where: { sku } }),
    prisma.product.findUnique({ where: { name } }),
  ]);

  if (skuExists) {
    return Response.json({ message: "SKU already exists" }, { status: 409 });
  }
  if (nameExists) {
    return Response.json(
      { message: "Product name already exists" },
      { status: 409 }
    );
  }

  const product = await prisma.product.create({
    data: {
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      barcode: barcode?.trim() || null,
      description: description?.trim() || null,
      price: parsedPrice,
      costPrice: costPrice ? parseFloat(costPrice) : null,
      stockQty: parsedStock,
      lowStockLimit: parseInt(lowStockLimit) || 5,
      categoryId: parseInt(categoryId),
    },
    include: { category: { select: { id: true, name: true } } },
  });

  return Response.json(product, { status: 201 });
}
