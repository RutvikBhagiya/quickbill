"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, ShoppingCart, X, Loader2, Search, ChevronDown,
  Package, Trash2, CheckCircle, XCircle, User, CreditCard,
  AlertTriangle, Eye,
} from "lucide-react";
import { useToast } from "@/components/ui/toaster";
import { useIsAdmin } from "@/components/dashboard/user-context";

/* ─────────────────── Types ─────────────────── */
interface Product { id: number; name: string; sku: string; price: string; stockQty: number; category: { name: string } }
interface CartItem { productId: number; name: string; price: number; quantity: number; stock: number }
interface OrderItem { id: number; productName: string; quantity: number; price: string; total: string }
interface Order {
  id: number; orderNumber: string; status: "CONFIRMED" | "CANCELLED";
  paymentMethod: string; subtotal: string; discount: string; tax: string; totalAmount: string;
  createdAt: string; customer: { name: string; phone?: string } | null;
  user: { name: string }; orderItems: OrderItem[];
  invoice: { invoiceNumber: string } | null;
}

const PM_LABELS: Record<string, string> = { CASH: "Cash", CARD: "Card", UPI: "UPI" };

/* ─────────────────── Order Detail Modal ─────────────────── */
function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 sticky top-0 bg-gray-900">
          <div>
            <h2 className="text-white font-bold text-lg">{order.orderNumber}</h2>
            <p className="text-gray-400 text-xs mt-0.5">
              {new Date(order.createdAt).toLocaleString()} · by {order.user.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${order.status === "CONFIRMED" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-red-500/20 text-red-300 border border-red-500/30"}`}>
              {order.status}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"><X size={18} /></button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Customer + Payment */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Customer</p>
              <p className="text-white font-medium">{order.customer?.name ?? "Guest"}</p>
              {order.customer?.phone && <p className="text-gray-400 text-sm">{order.customer.phone}</p>}
            </div>
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Payment</p>
              <p className="text-white font-medium">{PM_LABELS[order.paymentMethod] ?? order.paymentMethod}</p>
              {order.invoice && <p className="text-gray-400 text-xs mt-1">{order.invoice.invoiceNumber}</p>}
            </div>
          </div>

          {/* Items */}
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-gray-700">
                <th className="px-4 py-3 text-left text-xs text-gray-400 font-semibold uppercase">Item</th>
                <th className="px-4 py-3 text-center text-xs text-gray-400 font-semibold uppercase">Qty</th>
                <th className="px-4 py-3 text-right text-xs text-gray-400 font-semibold uppercase">Price</th>
                <th className="px-4 py-3 text-right text-xs text-gray-400 font-semibold uppercase">Total</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-700">
                {order.orderItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-white text-sm">{item.productName}</td>
                    <td className="px-4 py-3 text-center text-gray-300 text-sm">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-gray-300 text-sm">₹{parseFloat(item.price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-white font-medium text-sm">₹{parseFloat(item.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="bg-gray-800 rounded-xl p-4 space-y-2">
            {[
              ["Subtotal", order.subtotal],
              ["Discount", order.discount],
              ["Tax", order.tax],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-400">{label}</span>
                <span className="text-gray-300">₹{parseFloat(val).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
              <span className="text-white font-bold">Total</span>
              <span className="text-white font-bold text-lg">₹{parseFloat(order.totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── POS / New Order Modal ─────────────────── */
function NewOrderModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [discount, setDiscount] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then(setProducts)
      .catch(() => {});
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  function addToCart(p: Product) {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === p.id);
      if (existing) {
        if (existing.quantity >= p.stockQty) return prev;
        return prev.map((c) => c.productId === p.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { productId: p.id, name: p.name, price: parseFloat(p.price), quantity: 1, stock: p.stockQty }];
    });
  }

  function changeQty(productId: number, delta: number) {
    setCart((prev) =>
      prev
        .map((c) => c.productId === productId ? { ...c, quantity: Math.max(1, Math.min(c.quantity + delta, c.stock)) } : c)
        .filter((c) => c.quantity > 0)
    );
  }

  function removeFromCart(productId: number) {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  }

  const subtotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const discountAmt = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountAmt);

  async function handleSubmit() {
    if (cart.length === 0) { toast.warning("Cart is empty", "Add products before placing an order."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity, price: c.price })),
          paymentMethod, discount: discountAmt, tax: 0,
          customerName: customerName.trim() || null,
          customerPhone: customerPhone.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error("Order failed", data.message); return; }
      toast.success("Order placed!", `Order ${data.orderNumber} created.`);
      onCreated();
      onClose();
    } catch { toast.error("Network error", "Please try again."); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-5xl shadow-2xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <h2 className="text-white font-bold text-lg flex items-center gap-2"><ShoppingCart size={20} className="text-violet-400" /> New Order</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"><X size={18} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* LEFT: Product search */}
          <div className="flex-1 flex flex-col border-r border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800 shrink-0">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" placeholder="Search products..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 content-start">
              {filtered.map((p) => {
                const inCart = cart.find((c) => c.productId === p.id);
                const outOfStock = p.stockQty === 0;
                return (
                  <button key={p.id} onClick={() => !outOfStock && addToCart(p)} disabled={outOfStock}
                    className={`text-left p-4 bg-gray-800 rounded-xl border transition-all ${outOfStock ? "border-gray-800 opacity-40 cursor-not-allowed" : inCart ? "border-violet-500/60 bg-violet-500/10" : "border-gray-700 hover:border-gray-600 hover:bg-gray-750"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{p.name}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{p.category.name}</p>
                      </div>
                      {inCart && <span className="shrink-0 text-xs bg-violet-600 text-white px-1.5 py-0.5 rounded-full">×{inCart.quantity}</span>}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-violet-400 font-semibold text-sm">₹{parseFloat(p.price).toFixed(2)}</span>
                      <span className={`text-xs ${p.stockQty <= 5 ? "text-amber-400" : "text-gray-500"}`}>
                        {outOfStock ? "Out of stock" : `${p.stockQty} left`}
                      </span>
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-2 flex flex-col items-center justify-center py-12 text-center">
                  <Package size={32} className="text-gray-600 mb-3" />
                  <p className="text-gray-400 text-sm">No products found</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Cart + Checkout */}
          <div className="w-80 flex flex-col overflow-hidden shrink-0">
            {/* Cart items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">Cart ({cart.length})</p>
              {cart.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ShoppingCart size={28} className="text-gray-600 mb-2" />
                  <p className="text-gray-500 text-sm">Cart is empty</p>
                </div>
              )}
              {cart.map((item) => (
                <div key={item.productId} className="bg-gray-800 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-white text-sm font-medium leading-snug">{item.name}</p>
                    <button onClick={() => removeFromCart(item.productId)} className="text-gray-500 hover:text-red-400 transition-colors shrink-0"><Trash2 size={13} /></button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => changeQty(item.productId, -1)} className="w-6 h-6 rounded-md bg-gray-700 text-white text-sm flex items-center justify-center hover:bg-gray-600 transition-colors">−</button>
                      <span className="text-white text-sm w-6 text-center">{item.quantity}</span>
                      <button onClick={() => changeQty(item.productId, 1)} className="w-6 h-6 rounded-md bg-gray-700 text-white text-sm flex items-center justify-center hover:bg-gray-600 transition-colors">+</button>
                    </div>
                    <span className="text-violet-400 font-semibold text-sm">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Checkout form */}
            <div className="border-t border-gray-800 p-4 space-y-3 shrink-0">
              {/* Customer (optional) */}
              <div className="space-y-2">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5"><User size={12} /> Customer (optional)</p>
                <input type="text" placeholder="Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition" />
                <input type="text" placeholder="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition" />
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5"><CreditCard size={12} /> Payment</p>
                <div className="relative">
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full appearance-none bg-gray-800 border border-gray-700 text-white rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:border-violet-500 transition cursor-pointer">
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Discount */}
              <div className="space-y-1.5">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Discount (₹)</p>
                <input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition" />
              </div>

              {/* Totals */}
              <div className="bg-gray-800 rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between text-sm"><span className="text-gray-400">Subtotal</span><span className="text-gray-300">₹{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">Discount</span><span className="text-gray-300">−₹{discountAmt.toFixed(2)}</span></div>
                <div className="flex justify-between border-t border-gray-700 pt-2">
                  <span className="text-white font-bold">Total</span>
                  <span className="text-violet-400 font-bold text-base">₹{total.toFixed(2)}</span>
                </div>
              </div>

              <button onClick={handleSubmit} disabled={submitting || cart.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                {submitting ? "Placing Order..." : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Main Orders Page ─────────────────── */
export default function OrdersPage() {
  const toast = useToast();
  const isAdmin = useIsAdmin();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [newOrderOpen, setNewOrderOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter ? `/api/orders?status=${statusFilter}` : "/api/orders";
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      setOrders(await res.json());
    } catch { toast.error("Load failed", "Could not load orders."); }
    finally { setLoading(false); }
  }, [statusFilter]); // eslint-disable-line

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${cancelTarget.id}`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) { toast.error("Cancel failed", data.message); return; }
      toast.success("Order cancelled", "Stock has been restored.");
      setCancelTarget(null);
      fetchOrders();
    } catch { toast.error("Cancel failed", "Please try again."); }
    finally { setCancelling(false); }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Orders</h1>
          <p className="text-gray-400 mt-1 text-sm">Manage sales orders</p>
        </div>
        <button onClick={() => setNewOrderOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium text-sm transition-colors">
          <Plus size={16} /> New Order
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        {["", "CONFIRMED", "CANCELLED"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${statusFilter === s ? "bg-violet-600/20 border-violet-500/40 text-violet-300" : "bg-gray-900 border-gray-800 text-gray-400 hover:text-white"}`}>
            {s === "" ? "All" : s === "CONFIRMED" ? "Confirmed" : "Cancelled"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-violet-400 w-8 h-8" /></div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingCart className="text-gray-600 w-10 h-10 mb-3" />
            <p className="text-gray-400 font-medium">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px]">
              <thead><tr className="border-b border-gray-800 text-left">
                {["Order #", "Customer", "Items", "Payment", "Total", "Status", "Date", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-800">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs bg-gray-800 text-violet-300 px-2 py-1 rounded-lg">{o.orderNumber}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-300 text-sm">{o.customer?.name ?? <span className="text-gray-500 italic">Guest</span>}</td>
                    <td className="px-6 py-4 text-gray-300 text-sm">{o.orderItems.length}</td>
                    <td className="px-6 py-4 text-gray-300 text-sm">{PM_LABELS[o.paymentMethod] ?? o.paymentMethod}</td>
                    <td className="px-6 py-4 text-white font-semibold text-sm">₹{parseFloat(o.totalAmount).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${o.status === "CONFIRMED" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-red-500/15 text-red-300 border-red-500/30"}`}>
                        {o.status === "CONFIRMED" ? <CheckCircle size={11} /> : <XCircle size={11} />} {o.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedOrder(o)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" title="View"><Eye size={15} /></button>
                        {isAdmin && o.status === "CONFIRMED" && (
                          <button onClick={() => setCancelTarget(o)} className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Cancel"><XCircle size={15} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {newOrderOpen && <NewOrderModal onClose={() => setNewOrderOpen(false)} onCreated={fetchOrders} />}
      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}

      {/* Cancel Confirm */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <AlertTriangle size={18} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold">Cancel Order?</h2>
                <p className="text-gray-400 text-sm">Stock will be restored automatically.</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm">Cancel <span className="font-semibold text-white">{cancelTarget.orderNumber}</span>?</p>
            <div className="flex gap-3">
              <button onClick={() => setCancelTarget(null)} className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors">Keep</button>
              <button onClick={handleCancel} disabled={cancelling}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
                {cancelling && <Loader2 size={14} className="animate-spin" />} Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
