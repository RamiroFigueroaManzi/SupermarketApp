"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Banknote, CreditCard, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface Item {
  productoId: string | null;
  nombreDetectado: string;
  productoNombre: string | null;
  precio: string | null;
  cantidad: number;
  confianza: "alta" | "media" | "baja" | "no_encontrado";
  categoria: string | null;
  imageUrl: string | null;
}

interface Props {
  orderId: string;
  total: string;
  cantidadItems: number;
  items: Item[];
}

export default function PagoForm({ orderId, total, cantidadItems, items }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"efectivo" | "mp" | "volver" | null>(null);

  const handleVolver = async () => {
    setLoading("volver");
    try {
      // Delete the BORRADOR order
      await fetch(`/api/pedidos/${orderId}`, { method: "DELETE" });
      // Prefill the form with the original items
      sessionStorage.setItem("pedido_prefill", JSON.stringify(items));
    } catch {
      // If delete fails, still go back — the BORRADOR will be cleaned up later
    }
    router.push("/cliente/pedido/nuevo");
  };

  const handlePago = async (method: "EFECTIVO" | "MERCADO_PAGO") => {
    setLoading(method === "EFECTIVO" ? "efectivo" : "mp");
    try {
      const res = await fetch(`/api/pedidos/${orderId}/pagar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al procesar");

      if (method === "EFECTIVO") {
        toast.success("¡Pedido confirmado! Pagás al retirar.");
        router.push(`/cliente/pedido/${orderId}`);
      } else {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al procesar el pago");
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={handleVolver}
          disabled={!!loading}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-4 transition-colors disabled:opacity-50"
        >
          {loading === "volver" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowLeft className="h-4 w-4" />
          )}
          Volver
        </button>
        <h1 className="text-xl font-semibold">Elegí cómo pagar</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          {cantidadItems} producto{cantidadItems !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Total */}
      <Card className="border-[var(--primary)]/30 bg-[var(--primary)]/5">
        <CardContent className="p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--muted-foreground)]">Total a pagar</span>
          <span className="text-2xl font-bold text-[var(--primary)]">
            {formatCurrency(parseFloat(total))}
          </span>
        </CardContent>
      </Card>

      {/* Métodos */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
          Método de pago
        </p>

        <button
          onClick={() => handlePago("EFECTIVO")}
          disabled={!!loading}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 border-[var(--border)] bg-white hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
        >
          <div className="h-11 w-11 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            {loading === "efectivo" ? (
              <Loader2 className="h-5 w-5 text-green-700 animate-spin" />
            ) : (
              <Banknote className="h-5 w-5 text-green-700" />
            )}
          </div>
          <div>
            <p className="font-semibold text-sm">Efectivo</p>
            <p className="text-xs text-[var(--muted-foreground)]">Pagás al retirar el pedido</p>
          </div>
        </button>

        <button
          onClick={() => handlePago("MERCADO_PAGO")}
          disabled={!!loading}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 border-[var(--border)] bg-white hover:border-[#009ee3] hover:bg-[#009ee3]/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
        >
          <div className="h-11 w-11 rounded-full bg-[#009ee3]/10 flex items-center justify-center shrink-0">
            {loading === "mp" ? (
              <Loader2 className="h-5 w-5 text-[#009ee3] animate-spin" />
            ) : (
              <CreditCard className="h-5 w-5 text-[#009ee3]" />
            )}
          </div>
          <div>
            <p className="font-semibold text-sm">Mercado Pago</p>
            <p className="text-xs text-[var(--muted-foreground)]">Tarjeta, QR o saldo MP</p>
          </div>
        </button>
      </div>
    </div>
  );
}
