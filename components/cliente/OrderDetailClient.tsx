"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Package, ShoppingBasket } from "lucide-react";
import Image from "next/image";
import { formatCurrency, formatDate } from "@/lib/utils";
import { OrderStatus } from "@prisma/client";
import { toast } from "sonner";

const STATUS_STEPS: OrderStatus[] = ["RECIBIDO", "EN_PREPARACION", "LISTO", "TERMINADO"];
const STATUS_LABELS: Record<string, string> = {
  RECIBIDO: "Recibido",
  EN_PREPARACION: "En preparación",
  LISTO: "Listo",
  TERMINADO: "Terminado",
};

interface OrderData {
  id: string;
  status: OrderStatus;
  totalAmount: string;
  createdAt: string;
  items: { id: string; productName: string; unitPrice: string; quantity: number; categoryName: string | null; imageUrl: string | null }[];
  statusHistory: { fromStatus: string | null; toStatus: string; createdAt: string }[];
}

interface Props {
  order: OrderData;
  userId: string;
}

export default function OrderDetailClient({ order, userId }: Props) {
  const router = useRouter();
  const currentStepIdx = STATUS_STEPS.indexOf(order.status);
  const progress = order.status === "TERMINADO" ? 100 : ((currentStepIdx + 1) / STATUS_STEPS.length) * 100;

  useEffect(() => {
    if (order.status === "TERMINADO") return;

    const socket = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
      auth: { userId, role: "cliente" },
    });

    socket.on("pedido:estado_cambiado", (data: { pedidoId: string; nuevoEstado: string }) => {
      if (data.pedidoId !== order.id) return;
      if (data.nuevoEstado === "LISTO") {
        toast.success("¡Tu pedido está listo para retirar!", { duration: 10000 });
        if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
      }
      router.refresh();
    });

    return () => { socket.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id, order.status, userId]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-[var(--muted-foreground)]">
          <Link href="/cliente"><ArrowLeft className="h-4 w-4" />Mis pedidos</Link>
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="font-semibold">Pedido #{order.id.slice(-6).toUpperCase()}</h1>
          <Badge className={`border-0 ${order.status === "LISTO" ? "bg-green-100 text-green-700 animate-pulse" : "bg-blue-100 text-blue-700"}`}>
            {STATUS_LABELS[order.status] || order.status}
          </Badge>
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">{formatDate(order.createdAt)}</p>
      </div>

      {/* Progress bar */}
      {order.status !== "TERMINADO" && (
        <Card className="border-[var(--border)]">
          <CardContent className="p-4 space-y-3">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between">
              {STATUS_STEPS.map((step, idx) => (
                <div key={step} className="flex flex-col items-center gap-1">
                  <div className={`h-2 w-2 rounded-full ${idx <= currentStepIdx ? "bg-[var(--primary)]" : "bg-[var(--border)]"}`} />
                  <span className={`text-[10px] text-center leading-tight ${idx <= currentStepIdx ? "text-[var(--primary)] font-medium" : "text-[var(--muted-foreground)]"}`}>
                    {STATUS_LABELS[step]}
                  </span>
                </div>
              ))}
            </div>
            {order.status === "LISTO" && (
              <p className="text-center text-sm font-medium text-green-700 bg-green-50 rounded-lg p-2">
                ¡Tu pedido está listo para retirar! 🎉
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-2">
          <Package className="h-4 w-4" />
          Productos ({order.items.length})
        </h2>
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
            {/* Imagen del producto */}
            <div className="relative h-12 w-12 shrink-0 rounded-xl bg-gray-50 border border-[var(--border)] overflow-hidden flex items-center justify-center">
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt={item.productName} fill className="object-contain p-1" sizes="48px" unoptimized />
              ) : (
                <ShoppingBasket className="h-5 w-5 text-[var(--muted-foreground)] opacity-30" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.productName}</p>
              {item.categoryName && (
                <p className="text-xs text-[var(--muted-foreground)]">{item.categoryName}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold">x{item.quantity}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {formatCurrency(Number(item.unitPrice) * item.quantity)}
              </p>
            </div>
          </div>
        ))}
        <div className="flex justify-between items-center pt-2 font-semibold">
          <span>Total</span>
          <span className="text-[var(--primary)]">{formatCurrency(order.totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}
