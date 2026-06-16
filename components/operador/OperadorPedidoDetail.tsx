"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, User, Loader2, ShoppingBasket } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { OrderStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

interface OrderItem {
  id: string;
  productId: string | null;
  productName: string;
  categoryName: string | null;
  imageUrl: string | null;
  quantity: number;
  isChecked: boolean;
}

interface Props {
  order: {
    id: string;
    status: OrderStatus;
    clienteNombre: string;
    items: OrderItem[];
  };
  operadorId: string;
}

const NEXT_STATUS: Partial<Record<OrderStatus, { label: string; next: OrderStatus }>> = {
  RECIBIDO: { label: "Iniciar preparación", next: "EN_PREPARACION" },
  EN_PREPARACION: { label: "Marcar como listo", next: "LISTO" },
  LISTO: { label: "Confirmar retiro del cliente", next: "TERMINADO" },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  RECIBIDO: { label: "Recibido", className: "bg-blue-100 text-blue-700" },
  EN_PREPARACION: { label: "En preparación", className: "bg-orange-100 text-orange-700" },
  LISTO: { label: "Listo para retirar", className: "bg-green-100 text-green-700" },
};

export default function OperadorPedidoDetail({ order, operadorId }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(order.items);
  const [status, setStatus] = useState(order.status);
  const [loading, setLoading] = useState(false);

  const handleCheck = async (itemId: string, checked: boolean) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, isChecked: checked } : i)));
    await fetch(`/api/pedidos/${order.id}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isChecked: checked }),
    });
  };

  const handleStatusChange = async () => {
    const transition = NEXT_STATUS[status];
    if (!transition) return;
    setLoading(true);

    const res = await fetch(`/api/pedidos/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: transition.next }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Error al cambiar estado");
      return;
    }

    setStatus(transition.next);
    if (transition.next === "TERMINADO") {
      toast.success("Pedido terminado");
      router.push("/operador");
    } else {
      toast.success(`Estado: ${STATUS_CONFIG[transition.next]?.label}`);
    }
  };

  const config = STATUS_CONFIG[status];
  const transition = NEXT_STATUS[status];
  const checkedCount = items.filter((i) => i.isChecked).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-[var(--muted-foreground)]">
          <Link href="/operador"><ArrowLeft className="h-4 w-4" />Pedidos</Link>
        </Button>
      </div>

      <Card className="border-[var(--border)]">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--muted-foreground)]">
              #{order.id.slice(-6).toUpperCase()}
            </span>
            {config && (
              <Badge className={cn("border-0 text-xs", config.className)}>
                {config.label}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-[var(--muted-foreground)]" />
            <span>{order.clienteNombre}</span>
          </div>
          {status === "EN_PREPARACION" && (
            <p className="text-xs text-[var(--muted-foreground)]">
              {checkedCount} de {items.length} productos cargados
            </p>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
          Productos ({items.length})
        </h2>
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-xl transition-colors border border-[var(--border)]",
              item.isChecked && "bg-[var(--muted)] opacity-60"
            )}
          >
            <Checkbox
              id={item.id}
              checked={item.isChecked}
              onCheckedChange={(v) => handleCheck(item.id, !!v)}
              disabled={status !== "EN_PREPARACION"}
              className="border-[var(--primary)] data-[state=checked]:bg-[var(--primary)] shrink-0"
            />
            {/* Imagen del producto */}
            <div className="relative h-14 w-14 shrink-0 rounded-xl bg-gray-50 border border-[var(--border)] overflow-hidden flex items-center justify-center">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.productName}
                  fill
                  className="object-contain p-1"
                  sizes="56px"
                  unoptimized
                />
              ) : (
                <ShoppingBasket className="h-6 w-6 text-[var(--muted-foreground)] opacity-30" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium leading-tight", item.isChecked && "line-through")}>
                {item.productName}
              </p>
              {item.categoryName && (
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{item.categoryName}</p>
              )}
            </div>
            <span className={cn("text-base font-bold shrink-0", item.isChecked ? "text-[var(--muted-foreground)]" : "text-[var(--primary)]")}>
              x{item.quantity}
            </span>
          </div>
        ))}
      </div>

      <Separator />

      {transition && (
        <Button
          onClick={handleStatusChange}
          disabled={loading}
          className={cn(
            "w-full h-12 gap-2 text-white",
            status === "LISTO"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-[var(--primary)] hover:bg-[var(--primary-dark)]"
          )}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {transition.label}
        </Button>
      )}
    </div>
  );
}
