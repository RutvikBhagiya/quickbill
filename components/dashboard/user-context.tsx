"use client";

import { createContext, useContext } from "react";

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

const UserContext = createContext<SessionUser | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser(): SessionUser | null {
  return useContext(UserContext);
}

export function useIsAdmin(): boolean {
  const user = useContext(UserContext);
  return user?.role === "ADMIN";
}
