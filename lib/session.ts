import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function getCurrentUser() {
  const token = (await cookies()).get("token")?.value;

  if (!token) {
    return null;
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: decoded.id,
    },

    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  return user;
}