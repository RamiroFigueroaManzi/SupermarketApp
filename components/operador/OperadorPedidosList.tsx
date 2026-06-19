"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ShoppingBag, Banknote, CreditCard } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { OrderStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  RECIBIDO: { label: "Recibido", className: "bg-blue-100 text-blue-700" },
  EN_PREPARACION: { label: "En preparación", className: "bg-orange-100 text-orange-700" },
  LISTO: { label: "Listo", className: "bg-green-100 text-green-700" },
};

interface PedidoRow {
  id: string;
  status: OrderStatus;
  clienteNombre: string;
  cantidadItems: number;
  paymentMethod: "EFECTIVO" | "MERCADO_PAGO";
  paymentStatus: "PENDIENTE" | "PAGADO" | "FALLIDO";
  updatedAt: string;
}

interface Props {
  pedidos: PedidoRow[];
  misActivos: number;
  operadorId: string;
}

export default function OperadorPedidosList({ pedidos: initialPedidos, misActivos: initialActivos, operadorId }: Props) {
  const router = useRouter();
  const [pedidos, setPedidos] = useState(initialPedidos);
  const [misActivos, setMisActivos] = useState(initialActivos);

  useEffect(() => {
    // Polling de fallback: refresca cada 8s aunque el socket falle
    const interval = setInterval(() => { router.refresh(); }, 8000);

    const socket = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
      auth: { userId: operadorId, role: "OPERADOR" },
    });
    socket.on("pedidos:lista_actualizada", () => { router.refresh(); });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operadorId]);

  useEffect(() => {
    setPedidos(initialPedidos);
    setMisActivos(initialActivos);
  }, [initialPedidos, initialActivos]);

  const maxReached = misActivos >= 3;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Pedidos activos</h1>
        <span className={cn(
          "text-sm font-medium px-2.5 py-1 rounded-full",
          maxReached ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
        )}>
          Mis activos: {misActivos}/3
        </span>
      </div>

      {pedidos.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted-foreground)]">
          <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay pedidos activos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pedidos.map((pedido) => {
            const config = STATUS_CONFIG[pedido.status];
            const isDisabled = maxReached && pedido.status === "RECIBIDO";

            return (
              <Link
                key={pedido.id}
                href={isDisabled ? "#" : `/operador/pedido/${pedido.id}`}
                onClick={(e) => isDisabled && e.preventDefault()}
                title={isDisabled ? "Límite de 3 pedidos simultáneos alcanzado" : ""}
              >
                <Card className={cn(
                  "border-[var(--border)] transition-all",
                  isDisabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-md cursor-pointer"
                )}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-[var(--muted-foreground)]">
                          #{pedido.id.slice(-6).toUpperCase()}
                        </span>
                        <Badge className={cn("text-xs border-0", config.className)}>
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium truncate">{pedido.clienteNombre}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {pedido.cantidadItems} producto{pedido.cantidadItems !== 1 ? "s" : ""} · {formatRelativeTime(pedido.updatedAt)}
                        </p>
                        {pedido.paymentMethod === "MERCADO_PAGO" && pedido.paymentStatus === "PAGADO" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                            <CreditCard className="h-2.5 w-2.5" /> MP · Pagado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                            <Banknote className="h-2.5 w-2.5" /> Efectivo
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
