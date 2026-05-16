import { cookies } from "next/headers";
import { verifyToken } from "./auth";

export async function getAuthUser() {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}
