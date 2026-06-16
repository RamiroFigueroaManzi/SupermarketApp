"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { OrderStatus } from "@prisma/client";

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  BORRADOR: { label: "Borrador", className: "bg-gray-100 text-gray-600" },
  RECIBIDO: { label: "Recibido", className: "bg-blue-100 text-blue-700" },
  EN_PREPARACION: { label: "En preparación", className: "bg-orange-100 text-orange-700" },
  LISTO: { label: "¡Listo para retirar!", className: "bg-green-100 text-green-700" },
  TERMINADO: { label: "Terminado", className: "bg-gray-200 text-gray-500" },
};

interface Props {
  order: {
    id: string;
    status: OrderStatus;
    totalAmount: string;
    cantidadItems: number;
    updatedAt: string;
  };
}

export default function OrderCard({ order }: Props) {
  const config = STATUS_CONFIG[order.status];
  const isListo = order.status === "LISTO";

  return (
    <Link href={`/cliente/pedido/${order.id}`}>
      <Card className={cn(
        "border-[var(--border)] hover:shadow-md transition-all cursor-pointer",
        isListo && "border-green-400 ring-2 ring-green-200 animate-pulse"
      )}>
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-[var(--muted-foreground)]">
                #{order.id.slice(-6).toUpperCase()}
              </span>
              <Badge className={cn("text-xs font-medium border-0", config.className)}>
                {config.label}
              </Badge>
            </div>
            <p className="text-sm text-[var(--foreground)]">
              {order.cantidadItems} producto{order.cantidadItems !== 1 ? "s" : ""}{" "}
              · {formatCurrency(order.totalAmount)}
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {formatRelativeTime(order.updatedAt)}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}
