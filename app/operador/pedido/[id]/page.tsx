import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import OperadorPedidoDetail from "@/components/operador/OperadorPedidoDetail";

export default async function OperadorPedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const order = await db.order.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      items: {
        include: { product: { select: { imageUrl: true, category: { select: { name: true } } } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order || !["RECIBIDO", "EN_PREPARACION", "LISTO"].includes(order.status)) notFound();

  const serialized = {
    id: order.id,
    status: order.status,
    clienteNombre: order.user.name || order.user.email || "Cliente",
    items: order.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      categoryName: i.product?.category?.name ?? null,
      imageUrl: i.product?.imageUrl ?? null,
      quantity: i.quantity,
      isChecked: i.isChecked,
    })),
  };

  return <OperadorPedidoDetail order={serialized} operadorId={session!.user.id} />;
}
