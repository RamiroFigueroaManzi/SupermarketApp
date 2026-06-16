"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Type, Image as ImageIcon, Camera, Trash2, Plus, Loader2, AlertCircle, CheckCircle2, ListPlus, ShoppingBasket } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import ProductSearchModal from "@/components/cliente/ProductSearchModal";

type InputMode = "text" | "image" | "camera";

interface AIItem {
  productoId: string | null;
  nombreDetectado: string;
  productoNombre: string | null;
  precio: string | null;
  cantidad: number;
  confianza: "alta" | "media" | "baja" | "no_encontrado";
  categoria: string | null;
  imageUrl: string | null;
}

export default function NuevoPedidoForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<InputMode>("text");
  const [text, setText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [items, setItems] = useState<AIItem[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const total = items
    .filter((i) => i.productoId && i.precio)
    .reduce((sum, i) => sum + parseFloat(i.precio!) * i.cantidad, 0);

  const handleFileUpload = async (file: File) => {
    setProcessing(true);
    const formData = new FormData();
    formData.append("file", file);
    await processWithAI(formData);
  };

  const processWithAI = async (payload: FormData | { type: string; content: string }) => {
    try {
      const isFormData = payload instanceof FormData;
      const res = await fetch("/api/ia/procesar", {
        method: "POST",
        ...(isFormData
          ? { body: payload }
          : {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }),
      });
      const data = await res.json();
      if (!res.ok) {
        // IA no disponible → modo manual automático
        toast.warning(
          data.code === "QUOTA_EXCEEDED"
            ? "La IA no está disponible ahora. Agregá productos manualmente."
            : "No se pudo procesar con IA. Usá el buscador para agregar productos.",
          { duration: 6000 }
        );
        setItems([]); // Asegura que aparezca el estado de lista vacía con el buscador
        setShowSearch(true);
        return;
      }
      setItems(data.items);
      if (data.observaciones) toast.info(data.observaciones);
    } catch {
      toast.error("Error de conexión. Reintentá.");
    } finally {
      setProcessing(false);
    }
  };

  const handleTextProcess = () => {
    if (!text.trim()) return;
    setProcessing(true);
    processWithAI({ type: "text", content: text });
  };

  const updateQuantity = (idx: number, qty: number) => {
    if (qty < 1) return;
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, cantidad: qty } : item)));
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const addProduct = (product: { id: string; name: string; price: string; category: string; imageUrl: string | null }) => {
    const existing = items.findIndex((i) => i.productoId === product.id);
    if (existing >= 0) {
      updateQuantity(existing, items[existing].cantidad + 1);
    } else {
      setItems((prev) => [
        ...prev,
        {
          productoId: product.id,
          nombreDetectado: product.name,
          productoNombre: product.name,
          precio: product.price,
          cantidad: 1,
          confianza: "alta",
          categoria: product.category,
          imageUrl: product.imageUrl,
        },
      ]);
    }
  };

  const handleConfirm = async () => {
    const validItems = items.filter((i) => i.productoId);
    if (validItems.length === 0) {
      toast.error("No hay productos válidos para confirmar");
      return;
    }
    setConfirming(true);
    try {
      // Create order
      const orderRes = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: validItems.map((i) => ({ productId: i.productoId!, quantity: i.cantidad })),
        }),
      });
      if (!orderRes.ok) throw new Error();
      const { pedido } = await orderRes.json();

      // Confirm it
      await fetch(`/api/pedidos/${pedido.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RECIBIDO" }),
      });

      toast.success("¡Pedido confirmado!");
      router.push(`/cliente/pedido/${pedido.id}`);
    } catch {
      toast.error("Error al confirmar el pedido");
    } finally {
      setConfirming(false);
    }
  };

  if (processing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
        <p className="text-sm text-[var(--muted-foreground)]">Analizando tu lista...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-[var(--muted-foreground)]">
          <Link href="/cliente"><ArrowLeft className="h-4 w-4" />Volver</Link>
        </Button>
        <h1 className="text-lg font-semibold">Nuevo pedido</h1>
      </div>

      {items.length === 0 && !showSearch ? (
        <div className="space-y-4">
          {/* Mode selector */}
          <div className="grid grid-cols-3 gap-2">
            {([
              { mode: "text" as const, Icon: Type, label: "Texto" },
              { mode: "image" as const, Icon: ImageIcon, label: "Foto" },
              { mode: "camera" as const, Icon: Camera, label: "Cámara" },
            ] as const).map(({ mode: m, Icon, label }) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  mode === m
                    ? "border-[var(--primary)] bg-green-50 text-[var(--primary)]"
                    : "border-[var(--border)] text-[var(--muted-foreground)]"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>

          {mode === "text" && (
            <div className="space-y-3">
              <Textarea
                placeholder={"Ejemplo:\n2 litros de leche\n1 kg de manzanas\npan lactal"}
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <Button
                onClick={handleTextProcess}
                disabled={!text.trim()}
                className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white"
              >
                Procesar con IA
              </Button>
            </div>
          )}

          {(mode === "image" || mode === "camera") && (
            <div className="space-y-3">
              <input
                ref={mode === "image" ? fileInputRef : cameraInputRef}
                type="file"
                accept="image/*"
                capture={mode === "camera" ? "environment" : undefined}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              <Button
                onClick={() => (mode === "image" ? fileInputRef : cameraInputRef).current?.click()}
                className="w-full h-20 border-2 border-dashed border-[var(--primary)] bg-green-50 text-[var(--primary)] hover:bg-green-100 flex flex-col gap-1"
                variant="outline"
              >
                {mode === "image" ? <ImageIcon className="h-6 w-6" /> : <Camera className="h-6 w-6" />}
                <span className="text-sm">
                  {mode === "image" ? "Seleccionar imagen" : "Abrir cámara"}
                </span>
              </Button>
            </div>
          )}

          {/* Opción manual */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--muted-foreground)]">o</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>
          <Button
            variant="outline"
            className="w-full gap-2 border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]"
            onClick={() => setShowSearch(true)}
          >
            <ListPlus className="h-4 w-4" />
            Armar pedido manualmente
          </Button>
        </div>
      ) : (
        /* Items list (after AI or in manual mode) */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">
              {items.length === 0 ? "Pedido vacío" : `Tu pedido (${items.length} ítems)`}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => { setItems([]); setShowSearch(false); }} className="text-xs text-[var(--muted-foreground)]">
              Reiniciar
            </Button>
          </div>
          {items.length === 0 && (
            <p className="text-sm text-center text-[var(--muted-foreground)] py-4">
              Usá el buscador para agregar productos manualmente.
            </p>
          )}

          <div className="space-y-2">
            {items.map((item, idx) => (
              <Card key={idx} className={`border ${item.confianza === "no_encontrado" ? "border-yellow-300 bg-yellow-50" : "border-[var(--border)]"}`}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Imagen del producto */}
                    <div className="relative h-14 w-14 shrink-0 rounded-xl bg-gray-50 border border-[var(--border)] overflow-hidden flex items-center justify-center">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.productoNombre || item.nombreDetectado} fill className="object-contain p-1" sizes="56px" unoptimized />
                      ) : (
                        <ShoppingBasket className="h-5 w-5 text-[var(--muted-foreground)] opacity-30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.productoNombre || item.nombreDetectado}
                      </p>
                      {item.categoria && (
                        <p className="text-xs text-[var(--muted-foreground)]">{item.categoria}</p>
                      )}
                      {item.confianza === "no_encontrado" && (
                        <div className="flex items-center gap-1 text-xs text-yellow-700 mt-1">
                          <AlertCircle className="h-3 w-3" />
                          Producto no encontrado en catálogo
                        </div>
                      )}
                      {item.precio && (
                        <p className="text-xs text-[var(--primary)] font-medium mt-0.5">
                          {formatCurrency(item.precio)} c/u
                        </p>
                      )}
                    </div>
                    {item.productoId && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(idx, item.cantidad - 1)}
                          className="w-7 h-7 rounded-full border border-[var(--border)] flex items-center justify-center text-sm hover:bg-[var(--muted)]"
                        >−</button>
                        <span className="w-8 text-center text-sm font-medium">{item.cantidad}</span>
                        <button
                          onClick={() => updateQuantity(idx, item.cantidad + 1)}
                          className="w-7 h-7 rounded-full border border-[var(--border)] flex items-center justify-center text-sm hover:bg-[var(--muted)]"
                        >+</button>
                      </div>
                    )}
                    <button onClick={() => removeItem(idx)} className="text-[var(--muted-foreground)] hover:text-[var(--destructive)]">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full gap-2 border-dashed"
            onClick={() => setShowSearch(true)}
          >
            <Plus className="h-4 w-4" />
            Agregar producto
          </Button>

          <Separator />

          <div className="flex justify-between items-center font-semibold text-lg">
            <span>Total</span>
            <span className="text-[var(--primary)]">{formatCurrency(total)}</span>
          </div>

          <Button
            onClick={handleConfirm}
            disabled={confirming || items.filter((i) => i.productoId).length === 0}
            className="w-full h-12 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white gap-2"
          >
            {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {confirming ? "Confirmando..." : "Confirmar pedido"}
          </Button>
        </div>
      )}

      {showSearch && (
        <ProductSearchModal
          onSelect={addProduct}
          onClose={() => setShowSearch(false)}
          currentItems={items}
        />
      )}
    </div>
  );
}
