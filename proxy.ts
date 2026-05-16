import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/auth";

export function proxy(req: NextRequest) {
  const token = req.cookies.get("token")?.value;

  const pathname = req.nextUrl.pathname;

  const publicRoutes = ["/login"];

  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(
      new URL("/login", req.url)
    );
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return NextResponse.redirect(
      new URL("/login", req.url)
    );
  }

  // Prevent STAFF from accessing Admin-only routes
  const adminRoutes = ["/dashboard/categories", "/dashboard/reports"];
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  if (isAdminRoute && decoded.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
  ],
}