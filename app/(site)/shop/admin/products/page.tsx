"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/shop/ui/card";
import { Button } from "@/components/shop/ui/button";
import { Input } from "@/components/shop/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/shop/ui/alert-dialog";
import AdminLayout from "@/components/shop/admin/AdminLayout";
import ProtectedRoute from "@/components/shop/admin/ProtectedRoute";
import { supabase } from "@/lib/shop/supabase";
import { toast } from "@/components/shop/hooks/use-toast";
import type { ShopProduct } from "@/lib/shop/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";

interface ProductFormData {
  name: string;
  name_th: string;
  code: string;
  description: string;
  description_th: string;
  price: number;
  original_price: number | null;
  category: string;
  image_url: string;
  badge: string;
  in_stock: boolean;
}

const defaultForm: ProductFormData = {
  name: "", name_th: "", code: "", description: "", description_th: "",
  price: 0, original_price: null, category: "health", image_url: "", badge: "", in_stock: true,
};

const categoryOptions = ["health", "beauty", "lifestyle", "tech", "partner"];

function ProductsContent() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(defaultForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    const { data, error } = await supabase.from("shop_products").select("*").order("created_at", { ascending: false });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { setProducts((data || []) as ShopProduct[]); }
    setLoading(false);
  };

  useEffect(() => {
    let active = true
    supabase
      .from('shop_products')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return
        if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
        else setProducts((data || []) as ShopProduct[])
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, []);

  const openAdd = () => { setEditingId(null); setFormData(defaultForm); setImageFile(null); setShowForm(true); };

  const openEdit = (p: ShopProduct) => {
    setEditingId(p.id);
    setFormData({
      name: p.name, name_th: p.name_th || "", code: p.code,
      description: p.description || "", description_th: p.description_th || "",
      price: p.price, original_price: p.original_price, category: p.category,
      image_url: p.image_url || "", badge: p.badge || "", in_stock: p.in_stock,
    });
    setImageFile(null);
    setShowForm(true);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("shop-product-images").upload(path, file);
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return null; }
    const { data } = supabase.storage.from("shop-product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code || !formData.price) {
      toast({ title: "Error", description: "Please fill Name, Code, and Price", variant: "destructive" });
      return;
    }
    setSaving(true);

    let imageUrl = formData.image_url;
    if (imageFile) {
      const uploaded = await uploadImage(imageFile);
      if (uploaded) imageUrl = uploaded;
    }

    const payload = { ...formData, image_url: imageUrl };

    if (editingId) {
      const { error } = await supabase.from("shop_products").update(payload).eq("id", editingId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
      else { toast({ title: "Updated", description: `${formData.name} updated.` }); }
    } else {
      const { error } = await supabase.from("shop_products").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
      else { toast({ title: "Added", description: `${formData.name} added.` }); }
    }

    setSaving(false);
    setShowForm(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("shop_products").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Deleted", description: "Product removed." }); fetchProducts(); }
    setDeleteId(null);
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Products ({products.length})</h2>
          <p className="text-sm text-muted-foreground">Manage your product catalog</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <FontAwesomeIcon icon={faPlus} />
          Add Product
        </Button>
      </div>

      <div className="mb-4 max-w-md">
        <Input placeholder="Search by name, code, or category..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      {/* Product Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-xl border border-border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">{editingId ? "Edit Product" : "Add New Product"}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Product Name (EN) *</label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Product Name (TH)</label>
                    <Input value={formData.name_th} onChange={(e) => setFormData({ ...formData, name_th: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Product Code *</label>
                    <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Price (฿) *</label>
                    <Input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Original Price (฿)</label>
                    <Input type="number" value={formData.original_price || ""} onChange={(e) => setFormData({ ...formData, original_price: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Category</label>
                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {categoryOptions.map((cat) => (<option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Image URL</label>
                    <Input value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://..." />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Or Upload Image</label>
                    <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Badge</label>
                    <Input value={formData.badge} onChange={(e) => setFormData({ ...formData, badge: e.target.value })} placeholder="e.g. Best Seller, New" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-foreground mb-1 block">Description (EN)</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-foreground mb-1 block">Description (TH)</label>
                    <textarea value={formData.description_th} onChange={(e) => setFormData({ ...formData, description_th: e.target.value })} rows={2}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.in_stock} onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked })} className="w-4 h-4 rounded border-input accent-primary" />
                    <label className="text-sm font-medium text-foreground">In Stock</label>
                  </div>
                </div>

                {(formData.image_url || imageFile) && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">Image Preview</label>
                    <img src={imageFile ? URL.createObjectURL(imageFile) : formData.image_url} alt="Preview" className="w-20 h-20 object-cover rounded-lg border border-border" />
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editingId ? "Update Product" : "Save Product"}</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Product Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading products...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Image</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Product</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Code</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Price</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Category</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => (
                    <tr key={product.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <img src={product.image_url || "https://via.placeholder.com/40"} alt={product.name} className="w-10 h-10 rounded-lg object-cover border border-border" />
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-foreground">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.name_th}</p>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell font-mono text-xs text-muted-foreground">{product.code}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold">฿{Number(product.price).toLocaleString()}</span>
                        {product.original_price && (<span className="text-xs text-muted-foreground line-through ml-1">฿{Number(product.original_price).toLocaleString()}</span>)}
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent text-accent-foreground capitalize">{product.category}</span>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${product.in_stock ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                          {product.in_stock ? "In Stock" : "Out of Stock"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(product)} className="p-1.5 rounded-lg hover:bg-accent transition-colors text-sm" title="Edit" aria-label="Edit">
                            <FontAwesomeIcon icon={faPenToSquare} />
                          </button>
                          <button onClick={() => setDeleteId(product.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-sm" title="Delete" aria-label="Delete">
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No products found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

export default function AdminProductsPage() {
  return (
    <ProtectedRoute>
      <ProductsContent />
    </ProtectedRoute>
  );
}
