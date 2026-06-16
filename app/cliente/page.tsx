import { unstable_cache } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import OrderCard from "@/components/cliente/OrderCard";
import AutoRefresh from "@/components/AutoRefresh";

const getActiveOrders = unstable_cache(
  async (userId: string) => {
    const rows = await db.order.findMany({
      where: { userId, status: { notIn: ["BORRADOR", "TERMINADO"] } },
      include: { items: { select: { id: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((o) => ({
      id: o.id,
      status: o.status,
      totalAmount: o.totalAmount.toString(),
      cantidadItems: o.items.length,
      updatedAt: o.updatedAt.toISOString(),
    }));
  },
  ["cliente-active-orders"],
  { revalidate: 5, tags: ["orders"] }
);

export default async function ClienteHomePage() {
  const session = await auth();
  const orders = await getActiveOrders(session!.user.id);
  const firstName = session!.user.name?.split(" ")[0] || "cliente";

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <div>
        <h1 className="text-xl font-semibold">Hola, {firstName}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">¿Qué necesitás hoy?</p>
      </div>

      <Button asChild className="w-full h-12 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white gap-2">
        <Link href="/cliente/pedido/nuevo">
          <Plus className="h-5 w-5" />
          Nuevo pedido
        </Link>
      </Button>

      {orders.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
            Pedidos activos
          </h2>
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
            />
          ))}
        </section>
      ) : (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          <p className="text-sm">No tenés pedidos activos.</p>
          <p className="text-sm">¡Hacé tu primer pedido!</p>
        </div>
      )}
    </div>
  );
}
