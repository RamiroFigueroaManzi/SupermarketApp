"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ShoppingBasket, Plus, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  price: string;
  imageUrl: string | null;
  category: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
}

interface Props {
  onSelect: (product: { id: string; name: string; price: string; category: string; imageUrl: string | null }) => void;
  onClose: () => void;
  currentItems?: { productoId: string | null }[];
}

export default function ProductSearchModal({ onSelect, onClose, currentItems = [] }: Props) {
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/categorias").then((r) => r.json()).then((d) => setCategories(d.categorias));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "40" });
    if (q) params.set("q", q);
    if (categoria !== "all") params.set("categoria", categoria);

    const timeout = setTimeout(() => {
      fetch(`/api/productos?${params}`)
        .then((r) => r.json())
        .then((d) => { setProducts(d.productos); setLoading(false); });
    }, 300);
    return () => clearTimeout(timeout);
  }, [q, categoria]);

  const handleSelect = (p: Product) => {
    onSelect({ id: p.id, name: p.name, price: p.price, category: p.category.name, imageUrl: p.imageUrl });
    setAddedIds((prev) => new Set(prev).add(p.id));
    // Feedback visual por 1.5s, luego resetea
    setTimeout(() => setAddedIds((prev) => { const s = new Set(prev); s.delete(p.id); return s; }), 1500);
  };

  const inCart = (id: string) => currentItems.some((i) => i.productoId === id);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 pt-4 pb-0 shrink-0">
          <DialogTitle className="text-base font-semibold mb-3">Agregar producto</DialogTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
            <Input
              placeholder="Buscar producto..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 bg-[var(--muted)] border-0 focus-visible:ring-1"
              autoFocus
            />
          </div>
        </DialogHeader>

        {/* Chips de categoría */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setCategoria("all")}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              categoria === "all"
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"
            }`}
          >
            Todos
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoria(c.id)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                categoria === c.id
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Grid de productos */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-52 rounded-2xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--muted-foreground)]">
              <ShoppingBasket className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">No se encontraron productos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {products.map((p) => {
                const isAdded = addedIds.has(p.id);
                const isInCart = inCart(p.id);
                return (
                  <div
                    key={p.id}
                    className="flex flex-col rounded-2xl overflow-hidden border border-[var(--border)] bg-white hover:shadow-md transition-shadow"
                  >
                    {/* Imagen */}
                    <div className="relative bg-gray-50 h-36 flex items-center justify-center">
                      {p.imageUrl ? (
                        <Image
                          src={p.imageUrl}
                          alt={p.name}
                          fill
                          className="object-contain p-3"
                          sizes="160px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 opacity-25">
                          <ShoppingBasket className="h-10 w-10" />
                          <span className="text-[10px]">{p.category.name}</span>
                        </div>
                      )}
                      {isInCart && !isAdded && (
                        <div className="absolute top-2 right-2 bg-[var(--primary)] text-white rounded-full h-5 w-5 flex items-center justify-center">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>

                    {/* Info + botón */}
                    <div className="p-2.5 flex flex-col gap-1.5 flex-1">
                      <p className="text-xs font-medium leading-tight line-clamp-2 text-[var(--foreground)]">
                        {p.name}
                      </p>
                      <p className="text-[11px] text-[var(--muted-foreground)]">{p.category.name}</p>
                      <div className="flex items-center justify-between mt-auto pt-1">
                        <p className="text-sm font-bold text-[var(--foreground)]">
                          {formatCurrency(p.price)}
                        </p>
                        <button
                          onClick={() => handleSelect(p)}
                          className={`h-8 w-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
                            isAdded
                              ? "bg-green-100 text-green-600 scale-95"
                              : "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] active:scale-95"
                          }`}
                        >
                          {isAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
