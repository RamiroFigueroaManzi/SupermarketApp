import { unstable_cache } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import OperadorPedidosList from "@/components/operador/OperadorPedidosList";
import AutoRefresh from "@/components/AutoRefresh";

const getPedidosActivos = unstable_cache(
  async () => {
    const rows = await db.order.findMany({
      where: { status: { in: ["RECIBIDO", "EN_PREPARACION", "LISTO"] } },
      include: {
        user: { select: { name: true, email: true } },
        items: { select: { id: true } },
      },
      orderBy: { updatedAt: "asc" },
    });
    return rows.map((p) => ({
      id: p.id,
      status: p.status,
      clienteNombre: p.user.name || p.user.email || "Cliente",
      cantidadItems: p.items.length,
      updatedAt: p.updatedAt.toISOString(),
    }));
  },
  ["operador-pedidos"],
  { revalidate: 5, tags: ["orders"] }
);

export default async function OperadorPage() {
  const session = await auth();

  const [serialized, misActivos] = await Promise.all([
    getPedidosActivos(),
    db.order.count({
      where: { operadorId: session!.user.id, status: "EN_PREPARACION" },
    }),
  ]);

  return (
    <>
      <AutoRefresh />
      <OperadorPedidosList
        pedidos={serialized}
        misActivos={misActivos}
        operadorId={session!.user.id}
      />
    </>
  );
}
