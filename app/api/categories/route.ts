import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

async function getAuthUser() {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

// GET /api/categories — list all categories
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { products: true } },
    },
  });

  return Response.json(categories);
}

// POST /api/categories — create category
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "ADMIN") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
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

  if (existing) {
    return Response.json(
      { message: "Category with this name already exists" },
      { status: 409 }
    );
  }

  const category = await prisma.category.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
    },
  });

  return Response.json(category, { status: 201 });
}
