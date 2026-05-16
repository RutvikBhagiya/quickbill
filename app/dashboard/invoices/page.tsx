"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Loader2, Eye, X, CheckCircle, XCircle, Printer } from "lucide-react";
import { useToast } from "@/components/ui/toaster";

interface OrderItem { id: number; productName: string; quantity: number; price: string; total: string }
interface Invoice {
  id: number;
  invoiceNumber: string;
  generatedAt: string;
  pdfUrl: string | null;
  order: {
    id: number;
    orderNumber: string;
    status: "CONFIRMED" | "CANCELLED";
    paymentMethod: string;
    subtotal: string;
    tax: string;
    discount: string;
    totalAmount: string;
    createdAt: string;
    customer: { name: string; phone?: string } | null;
    user: { name: string };
    orderItems: OrderItem[];
  };
}

const PM_LABELS: Record<string, string> = { CASH: "Cash", CARD: "Card", UPI: "UPI" };

function InvoiceDetailModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const o = invoice.order;

  function handlePrint() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; color: #000; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
            .grid { display: flex; gap: 60px; margin-bottom: 40px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th, td { text-align: left; padding: 12px 0; border-bottom: 1px solid #eee; }
            th { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            .totals { width: 300px; margin-left: auto; }
            .totals div { display: flex; justify-content: space-between; padding: 8px 0; color: #444; }
            .grand-total { font-size: 20px; font-weight: bold; border-top: 2px solid #000 !important; color: #000 !important; padding-top: 15px !important; margin-top: 10px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 style="margin:0 0 5px 0; font-size: 28px;">INVOICE</h1>
              <p style="margin:0; color:#666;">#${invoice.invoiceNumber}</p>
            </div>
            <div style="text-align:right;">
              <h2 style="margin:0 0 5px 0; font-size: 20px;">QuickBill POS</h2>
              <p style="margin:0; color:#666;">${new Date(invoice.generatedAt).toLocaleString()}</p>
            </div>
          </div>
          
          <div class="grid">
            <div>
              <p style="margin:0; color:#666; font-size:12px;">BILLED TO</p>
              <p style="margin:5px 0 0 0; font-weight:bold; font-size: 14px;">${o.customer?.name ?? "Guest"}</p>
            </div>
            <div>
              <p style="margin:0; color:#666; font-size:12px;">PAYMENT METHOD</p>
              <p style="margin:5px 0 0 0; font-weight:bold; font-size: 14px;">${PM_LABELS[o.paymentMethod] ?? o.paymentMethod}</p>
            </div>
            <div>
              <p style="margin:0; color:#666; font-size:12px;">SERVED BY</p>
              <p style="margin:5px 0 0 0; font-weight:bold; font-size: 14px;">${o.user.name}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Unit Price</th>
                <th style="text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${o.orderItems.map((item) => `
                <tr>
                  <td style="font-weight: 500;">${item.productName}</td>
                  <td style="text-align:center;">${item.quantity}</td>
                  <td style="text-align:right;">₹${parseFloat(item.price).toFixed(2)}</td>
                  <td style="text-align:right; font-weight:bold;">₹${parseFloat(item.total).toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="totals">
            <div><span>Subtotal</span><span>₹${parseFloat(o.subtotal).toFixed(2)}</span></div>
            <div><span>Discount</span><span>₹${parseFloat(o.discount).toFixed(2)}</span></div>
            <div><span>Tax</span><span>₹${parseFloat(o.tax).toFixed(2)}</span></div>
            <div class="grand-total"><span>Grand Total</span><span>₹${parseFloat(o.totalAmount).toFixed(2)}</span></div>
          </div>
          
          <div style="margin-top: 60px; text-align: center; color: #666; font-size: 14px;">
            <p>Thank you for your business!</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-800 sticky top-0 bg-gray-900 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">{invoice.invoiceNumber}</h2>
            <p className="text-gray-400 text-xs mt-0.5">Order: {o.orderNumber} · {new Date(invoice.generatedAt).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${o.status === "CONFIRMED" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"}`}>
              {o.status}
            </span>
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 border border-violet-500/30 transition-colors text-xs font-semibold">
              <Printer size={14} /> Export PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"><X size={18} /></button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Info grid */}
          <div className="grid grid-cols-3 gap-4">
            {[
              ["Customer", o.customer?.name ?? "Guest"],
              ["Payment", PM_LABELS[o.paymentMethod] ?? o.paymentMethod],
              ["Served by", o.user.name],
            ].map(([label, value]) => (
              <div key={label} className="bg-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-xs font-medium mb-1">{label}</p>
                <p className="text-white font-medium text-sm">{value}</p>
              </div>
            ))}
          </div>

          {/* Items table */}
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-gray-700">
                <th className="px-4 py-3 text-left text-xs text-gray-400 font-semibold uppercase">Item</th>
                <th className="px-4 py-3 text-center text-xs text-gray-400 font-semibold uppercase">Qty</th>
                <th className="px-4 py-3 text-right text-xs text-gray-400 font-semibold uppercase">Unit Price</th>
                <th className="px-4 py-3 text-right text-xs text-gray-400 font-semibold uppercase">Total</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-700">
                {o.orderItems.map((item) => (
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
            {[["Subtotal", o.subtotal], ["Discount", o.discount], ["Tax", o.tax]].map(([label, val]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-400">{label}</span>
                <span className="text-gray-300">₹{parseFloat(val).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-gray-700 pt-2">
              <span className="text-white font-bold">Grand Total</span>
              <span className="text-violet-400 font-bold text-lg">₹{parseFloat(o.totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const toast = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Invoice | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invoices");
      if (!res.ok) throw new Error();
      setInvoices(await res.json());
    } catch { toast.error("Load failed", "Could not load invoices."); }
    finally { setLoading(false); }
  }, []); // eslint-disable-line

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Invoices</h1>
        <p className="text-gray-400 mt-1 text-sm">Auto-generated invoices for every order</p>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-violet-400 w-8 h-8" /></div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="text-gray-600 w-10 h-10 mb-3" />
            <p className="text-gray-400 font-medium">No invoices yet</p>
            <p className="text-gray-500 text-sm mt-1">Invoices are created automatically when orders are placed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead><tr className="border-b border-gray-800 text-left">
                {["Invoice #", "Order #", "Customer", "Items", "Payment", "Total", "Status", "Date", ""].map((h) => (
                  <th key={h} className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-800">
                {invoices.map((inv) => {
                  const o = inv.order;
                  return (
                    <tr key={inv.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs bg-gray-800 text-emerald-300 px-2 py-1 rounded-lg">{inv.invoiceNumber}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs bg-gray-800 text-violet-300 px-2 py-1 rounded-lg">{o.orderNumber}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-300 text-sm">{o.customer?.name ?? <span className="text-gray-500 italic">Guest</span>}</td>
                      <td className="px-6 py-4 text-gray-300 text-sm">{o.orderItems.length}</td>
                      <td className="px-6 py-4 text-gray-300 text-sm">{PM_LABELS[o.paymentMethod] ?? o.paymentMethod}</td>
                      <td className="px-6 py-4 text-white font-semibold text-sm">₹{parseFloat(o.totalAmount).toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${o.status === "CONFIRMED" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-red-500/15 text-red-300 border-red-500/30"}`}>
                          {o.status === "CONFIRMED" ? <CheckCircle size={11} /> : <XCircle size={11} />}
                          {o.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">{new Date(inv.generatedAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => setSelected(inv)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" title="View Invoice">
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <InvoiceDetailModal invoice={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
