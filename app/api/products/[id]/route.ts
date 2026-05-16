import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

async function getAuthUser() {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

// GET /api/products/[id]
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const productId = parseInt(id);
  if (isNaN(productId)) {
    return Response.json({ message: "Invalid ID" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: { select: { id: true, name: true } } },
  });

  if (!product) {
    return Response.json({ message: "Product not found" }, { status: 404 });
  }

  return Response.json(product);
}

// PUT /api/products/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN")
    return Response.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const productId = parseInt(id);
  if (isNaN(productId)) {
    return Response.json({ message: "Invalid ID" }, { status: 400 });
  }

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
    isActive,
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

  // Check uniqueness excluding current product
  const [skuExists, nameExists] = await Promise.all([
    prisma.product.findFirst({
      where: { sku, NOT: { id: productId } },
    }),
    prisma.product.findFirst({
      where: { name, NOT: { id: productId } },
    }),
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

  const product = await prisma.product.update({
    where: { id: productId },
    data: {
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      barcode: barcode?.trim() || null,
      description: description?.trim() || null,
      price: parsedPrice,
      costPrice: costPrice ? parseFloat(costPrice) : null,
      stockQty: parsedStock,
      lowStockLimit: parseInt(lowStockLimit) ?? 5,
      categoryId: parseInt(categoryId),
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
    },
    include: { category: { select: { id: true, name: true } } },
  });

  return Response.json(product);
}

// DELETE /api/products/[id] — soft delete
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN")
    return Response.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const productId = parseInt(id);
  if (isNaN(productId)) {
    return Response.json({ message: "Invalid ID" }, { status: 400 });
  }

  // Soft delete — set isActive = false
  await prisma.product.update({
    where: { id: productId },
    data: { isActive: false },
  });

  return Response.json({ message: "Product deactivated" });
}
