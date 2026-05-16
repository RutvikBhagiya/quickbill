import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import Sidebar from "@/components/dashboard/sidebar";
import { ToastProvider, Toaster } from "@/components/ui/toaster";
import { UserProvider } from "@/components/dashboard/user-context";

export const metadata = {
  title: "QuickBill — Dashboard",
  description: "QuickBill POS & Inventory Management System",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <UserProvider user={user}>
      <ToastProvider>
        <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
          <Sidebar user={user} />
          <main className="flex-1 overflow-y-auto bg-gray-950">{children}</main>
        </div>
        <Toaster />
      </ToastProvider>
    </UserProvider>
  );
}
