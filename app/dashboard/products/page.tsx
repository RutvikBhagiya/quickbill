"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Pencil, Trash2, Package, X, Loader2,
  Search, AlertTriangle, ChevronDown, Lock,
} from "lucide-react";
import { useToast } from "@/components/ui/toaster";
import { useIsAdmin } from "@/components/dashboard/user-context";

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  price: string;
  costPrice: string | null;
  stockQty: number;
  lowStockLimit: number;
  isActive: boolean;
  categoryId: number;
  category: { id: number; name: string };
  createdAt: string;
}

interface ProductForm {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  price: string;
  costPrice: string;
  stockQty: string;
  lowStockLimit: string;
  categoryId: string;
}

const defaultForm: ProductForm = {
  name: "",
  sku: "",
  barcode: "",
  description: "",
  price: "",
  costPrice: "",
  stockQty: "0",
  lowStockLimit: "5",
  categoryId: "",
};

export default function ProductsPage() {
  const toast = useToast();
  const isAdmin = useIsAdmin();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterCategory) params.set("categoryId", filterCategory);
      if (filterLowStock) params.set("lowStock", "true");

      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error();
      setProducts(await res.json());
    } catch {
      setError("Could not load products.");
    } finally {
      setLoading(false);
    }
  }, [search, filterCategory, filterLowStock]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) setCategories(await res.json());
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const t = setTimeout(fetchProducts, 300);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  function openCreate() {
    setEditing(null);
    setForm(defaultForm);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode ?? "",
      description: p.description ?? "",
      price: p.price,
      costPrice: p.costPrice ?? "",
      stockQty: String(p.stockQty),
      lowStockLimit: String(p.lowStockLimit),
      categoryId: String(p.categoryId),
    });
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(defaultForm);
    setFormError("");
  }

  function setField(field: keyof ProductForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    const url = editing ? `/api/products/${editing.id}` : "/api/products";
    const method = editing ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price),
          costPrice: form.costPrice ? parseFloat(form.costPrice) : null,
          stockQty: parseInt(form.stockQty),
          lowStockLimit: parseInt(form.lowStockLimit),
          categoryId: parseInt(form.categoryId),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message ?? "Something went wrong");
        toast.error("Save failed", data.message);
        return;
      }
      toast.success(editing ? "Product updated" : "Product created");
      closeModal();
      fetchProducts();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Deactivate failed", data.message);
        return;
      }
      toast.success("Product deactivated");
      setDeleteTarget(null);
      fetchProducts();
    } catch {
      toast.error("Deactivate failed", "Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  const isLowStock = (p: Product) => p.stockQty <= p.lowStockLimit;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {isAdmin ? "Manage your product inventory" : "Browse product inventory"}
          </p>
        </div>
        {isAdmin ? (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium text-sm transition-colors"
          >
            <Plus size={16} />
            Add Product
          </button>
        ) : (
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 border border-sky-500/30 text-sky-300 rounded-xl text-xs font-semibold">
            <Lock size={12} /> View Only
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-56">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 text-white placeholder-gray-500 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition"
          />
        </div>

        <div className="relative">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="appearance-none bg-gray-900 border border-gray-800 text-gray-300 rounded-xl pl-4 pr-9 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </div>

        <button
          onClick={() => setFilterLowStock((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
            filterLowStock
              ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
              : "bg-gray-900 border-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          <AlertTriangle size={14} />
          Low Stock
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-violet-400 w-8 h-8" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
              <Package className="text-gray-500 w-7 h-7" />
            </div>
            <p className="text-gray-400 font-medium">No products found</p>
            <p className="text-gray-500 text-sm mt-1">
              {search || filterCategory || filterLowStock
                ? "Try adjusting your filters."
                : "Add your first product to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  {[
                    "Product",
                    "SKU",
                    "Category",
                    "Price",
                    "Stock",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
                          <Package size={16} className="text-gray-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">
                            {p.name}
                          </p>
                          {p.description && (
                            <p className="text-gray-500 text-xs truncate max-w-[200px]">
                              {p.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-lg">
                        {p.sku}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {p.category.name}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white font-semibold text-sm">
                        ₹{parseFloat(p.price).toFixed(2)}
                      </p>
                      {p.costPrice && (
                        <p className="text-gray-500 text-xs">
                          Cost: ₹{parseFloat(p.costPrice).toFixed(2)}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-semibold ${
                            isLowStock(p)
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {p.stockQty}
                        </span>
                        {isLowStock(p) && (
                          <AlertTriangle
                            size={13}
                            className="text-amber-400"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isAdmin ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(p)}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Deactivate"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
              <h2 className="text-white font-semibold text-lg">
                {editing ? "Edit Product" : "New Product"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              {/* Row 1: Name + SKU */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">
                    Product Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="e.g. Wireless Mouse"
                    required
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">
                    SKU <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) =>
                      setField("sku", e.target.value.toUpperCase())
                    }
                    placeholder="e.g. WM-001"
                    required
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition"
                  />
                </div>
              </div>

              {/* Row 2: Category + Barcode */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">
                    Category <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={form.categoryId}
                      onChange={(e) => setField("categoryId", e.target.value)}
                      required
                      className="w-full appearance-none bg-gray-800 border border-gray-700 text-white rounded-xl pl-4 pr-9 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition cursor-pointer"
                    >
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={form.barcode}
                    onChange={(e) => setField("barcode", e.target.value)}
                    placeholder="Optional barcode"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition"
                  />
                </div>
              </div>

              {/* Row 3: Price + Cost Price */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">
                    Selling Price (₹) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setField("price", e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">
                    Cost Price (₹)
                  </label>
                  <input
                    type="number"
                    value={form.costPrice}
                    onChange={(e) => setField("costPrice", e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition"
                  />
                </div>
              </div>

              {/* Row 4: Stock + Low Stock Limit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    value={form.stockQty}
                    onChange={(e) => setField("stockQty", e.target.value)}
                    min="0"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">
                    Low Stock Alert Threshold
                  </label>
                  <input
                    type="number"
                    value={form.lowStockLimit}
                    onChange={(e) => setField("lowStockLimit", e.target.value)}
                    min="0"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Optional product description..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {submitting && (
                    <Loader2 size={15} className="animate-spin" />
                  )}
                  {editing ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Deactivate Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold">Deactivate Product</h2>
                <p className="text-gray-400 text-sm mt-0.5">
                  The product will be hidden but data is preserved.
                </p>
              </div>
            </div>
            <p className="text-gray-300 text-sm">
              Are you sure you want to deactivate{" "}
              <span className="font-semibold text-white">
                &quot;{deleteTarget.name}&quot;
              </span>
              ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {deleting && <Loader2 size={15} className="animate-spin" />}
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
