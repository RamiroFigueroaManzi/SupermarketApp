import { auth } from "@/auth";
import { db } from "@/lib/db";
import OrderCard from "@/components/cliente/OrderCard";
import { ClipboardList } from "lucide-react";

export default async function ClienteHistorialPage() {
  const session = await auth();
  const orders = await db.order.findMany({
    where: {
      userId: session!.user.id,
      status: "TERMINADO",
    },
    include: { items: { select: { id: true } } },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Historial de pedidos</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          {orders.length} pedido{orders.length !== 1 ? "s" : ""} completado{orders.length !== 1 ? "s" : ""}
        </p>
      </div>

      {orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={{
                id: order.id,
                status: order.status,
                totalAmount: order.totalAmount.toString(),
                cantidadItems: order.items.length,
                updatedAt: order.updatedAt.toISOString(),
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-[var(--muted-foreground)]">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Todavía no tenés pedidos completados.</p>
        </div>
      )}
    </div>
  );
}
