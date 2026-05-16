"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, Tag, ShoppingCart,
  FileText, BarChart2, LogOut, Zap, Shield, User,
} from "lucide-react";

interface SidebarUser { id: number; name: string; email: string; role: string }

const ALL_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/dashboard/categories", label: "Categories", icon: Tag, adminOnly: true },
  { href: "/dashboard/products", label: "Products", icon: Package, adminOnly: false },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart, adminOnly: false },
  { href: "/dashboard/invoices", label: "Invoices", icon: FileText, adminOnly: false },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart2, adminOnly: true },
];

export default function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user.role === "ADMIN";
  const navItems = ALL_NAV.filter((item) => !item.adminOnly || isAdmin);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-64 flex flex-col bg-gray-900 border-r border-gray-800 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-lg leading-none">QuickBill</p>
          <p className="text-gray-400 text-xs mt-0.5">POS System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, adminOnly }) => {
          const isActive = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${isActive ? "bg-violet-600/20 text-violet-300 border border-violet-500/30" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
              <div className="flex items-center gap-3">
                <Icon className={`shrink-0 ${isActive ? "text-violet-400" : ""}`} size={18} />
                {label}
              </div>
              {adminOnly && (
                <span className="text-[10px] font-semibold text-violet-400/60 bg-violet-500/10 px-1.5 py-0.5 rounded-md border border-violet-500/20">ADMIN</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User / Role / Logout */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-2">
        {/* Role Badge */}
        <div className="px-3 mb-1">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${isAdmin ? "bg-violet-500/15 text-violet-300 border-violet-500/30" : "bg-sky-500/15 text-sky-300 border-sky-500/30"}`}>
            {isAdmin ? <Shield size={11} /> : <User size={11} />}
            {isAdmin ? "Administrator" : "Staff Member"}
          </span>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold ${isAdmin ? "bg-gradient-to-br from-violet-500 to-indigo-600" : "bg-gradient-to-br from-sky-500 to-blue-600"}`}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{user.name}</p>
            <p className="text-gray-400 text-xs truncate">{user.email}</p>
          </div>
        </div>

        <button onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150">
          <LogOut size={18} /> Logout
        </button>
      </div>
    </aside>
  );
}
