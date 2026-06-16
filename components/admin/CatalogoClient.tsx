"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, Package, ImageOff, Upload, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  categoryId: string;
  category: { id: string; name: string };
}
interface Category { id: string; name: string }

const EMPTY_FORM = { name: "", description: "", price: "", categoryId: "", imageUrl: "" };

export default function CatalogoClient({ initialProductos, categorias }: { initialProductos: Product[]; categorias: Category[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [productos, setProductos] = useState(initialProductos);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const filtered = productos.filter((p) => {
    const matchQ = !q || p.name.toLowerCase().includes(q.toLowerCase());
    const matchCat = catFilter === "all" || p.categoryId === catFilter;
    return matchQ && matchCat;
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setModalOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description || "", price: p.price, categoryId: p.categoryId, imageUrl: p.imageUrl || "" });
    setImagePreview(p.imageUrl || null);
    setModalOpen(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview local inmediato
    setImagePreview(URL.createObjectURL(file));
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      toast.error(data.error || "Error al subir la imagen");
      setImagePreview(form.imageUrl || null);
      return;
    }
    setForm((prev) => ({ ...prev, imageUrl: data.url }));
    toast.success("Imagen subida correctamente");
  };

  const removeImage = () => {
    setImagePreview(null);
    setForm((prev) => ({ ...prev, imageUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.categoryId) { toast.error("Completá todos los campos requeridos"); return; }
    setSaving(true);
    const res = editing
      ? await fetch(`/api/productos/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      : await fetch("/api/productos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (!res.ok) { toast.error("Error al guardar"); return; }
    toast.success(editing ? "Producto actualizado" : "Producto creado");
    setModalOpen(false);
    router.refresh();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Desactivar "${name}"?`)) return;
    const res = await fetch(`/api/productos/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Error al desactivar"); return; }
    setProductos((prev) => prev.filter((p) => p.id !== id));
    toast.success("Producto desactivado");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catálogo de productos</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{filtered.length} de {productos.length} productos</p>
        </div>
        <Button onClick={openCreate} className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white gap-2">
          <Plus className="h-4 w-4" /> Nuevo producto
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 items-center">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input placeholder="Buscar por nombre..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Todas las categorías" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-[var(--muted)] hover:bg-[var(--muted)]">
              <TableHead className="w-8 pl-4">#</TableHead>
              <TableHead className="w-12">Img</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="w-24 text-right pr-4">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p, idx) => (
              <TableRow key={p.id} className="hover:bg-[var(--muted)]/50">
                <TableCell className="text-[var(--muted-foreground)] text-xs pl-4">{idx + 1}</TableCell>
                <TableCell>
                  <div className="relative h-9 w-9 rounded-md bg-gray-50 border border-[var(--border)] overflow-hidden flex items-center justify-center">
                    {p.imageUrl ? (
                      <Image src={p.imageUrl} alt={p.name} fill className="object-contain p-0.5" sizes="36px" unoptimized />
                    ) : (
                      <ImageOff className="h-4 w-4 text-[var(--muted-foreground)] opacity-40" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs font-normal">{p.category.name}</Badge>
                </TableCell>
                <TableCell className="text-sm text-[var(--muted-foreground)] max-w-xs truncate">
                  {p.description || <span className="italic opacity-40">Sin descripción</span>}
                </TableCell>
                <TableCell className="text-right font-semibold text-[var(--primary)]">
                  {formatCurrency(p.price)}
                </TableCell>
                <TableCell className="text-right pr-4">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600" onClick={() => openEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(p.id, p.name)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-[var(--muted-foreground)]">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No hay productos que coincidan</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal crear/editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[var(--primary)]" />
              {editing ? "Editar producto" : "Nuevo producto"}
            </DialogTitle>
          </DialogHeader>
          <Separator />
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Nombre <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Leche entera 1L" />
            </div>
            <div className="space-y-1.5">
              <Label>Categoría <span className="text-red-500">*</span></Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccioná" /></SelectTrigger>
                <SelectContent>{categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Precio (ARS) <span className="text-red-500">*</span></Label>
              <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Imagen del producto</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />
              {imagePreview ? (
                <div className="flex items-center gap-3">
                  <div className="relative h-20 w-20 rounded-xl border border-[var(--border)] bg-gray-50 overflow-hidden shrink-0">
                    <Image src={imagePreview} alt="Preview" fill className="object-contain p-1" sizes="80px" unoptimized />
                    {uploading && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="gap-2 text-xs"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Cambiar imagen
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeImage}
                      disabled={uploading}
                      className="gap-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
                    >
                      <X className="h-3.5 w-3.5" />
                      Quitar imagen
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-24 border-2 border-dashed border-[var(--border)] rounded-xl flex flex-col items-center justify-center gap-1.5 text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                >
                  <Upload className="h-6 w-6" />
                  <span className="text-xs font-medium">Seleccionar imagen</span>
                  <span className="text-[10px]">JPG, PNG o WebP · máx. 5MB</span>
                </button>
              )}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Descripción</Label>
              <Textarea rows={2} className="resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción breve del producto..." />
            </div>
          </div>
          <Separator />
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white">
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear producto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
