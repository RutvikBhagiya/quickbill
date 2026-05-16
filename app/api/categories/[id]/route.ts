import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

async function getAuthUser() {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

// GET /api/categories/[id]
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const categoryId = parseInt(id);

  if (isNaN(categoryId)) {
    return Response.json({ message: "Invalid ID" }, { status: 400 });
  }

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { _count: { select: { products: true } } },
  });

  if (!category) {
    return Response.json({ message: "Category not found" }, { status: 404 });
  }

  return Response.json(category);
}

// PUT /api/categories/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN")
    return Response.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const categoryId = parseInt(id);
  if (isNaN(categoryId)) {
    return Response.json({ message: "Invalid ID" }, { status: 400 });
  }

  const body = await request.json();
  const { name, description } = body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return Response.json(
      { message: "Category name is required" },
      { status: 400 }
    );
  }

  const existing = await prisma.category.findUnique({
    where: { name: name.trim() },
  });

  if (existing && existing.id !== categoryId) {
    return Response.json(
      { message: "Category with this name already exists" },
      { status: 409 }
    );
  }

  const category = await prisma.category.update({
    where: { id: categoryId },
    data: {
      name: name.trim(),
      description: description?.trim() || null,
    },
  });

  return Response.json(category);
}

// DELETE /api/categories/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN")
    return Response.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const categoryId = parseInt(id);
  if (isNaN(categoryId)) {
    return Response.json({ message: "Invalid ID" }, { status: 400 });
  }

  // Check if any products use this category
  const productCount = await prisma.product.count({
    where: { categoryId },
  });

  if (productCount > 0) {
    return Response.json(
      {
        message: `Cannot delete: ${productCount} product(s) use this category`,
      },
      { status: 409 }
    );
  }

  await prisma.category.delete({ where: { id: categoryId } });

  return Response.json({ message: "Category deleted" });
}
