import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  (await cookies()).set({
    name: "token",
    value: "",
    path: "/",
    expires: new Date(0),
  });

  return NextResponse.json({
    success: true,
    message: "Logged out successfully",
  });
}