import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import OrderDetailClient from "@/components/cliente/OrderDetailClient";
import { getAvgTiempoTotalSegundos } from "@/lib/tiempos";

export default async function PedidoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const [order, avgTiempoSegundos] = await Promise.all([
    db.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: { select: { imageUrl: true, category: { select: { name: true } } } } },
          orderBy: { createdAt: "asc" },
        },
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    }),
    getAvgTiempoTotalSegundos(),
  ]);

  if (!order || order.userId !== session!.user.id) notFound();

  const confirmedAt =
    order.statusHistory.find((h) => h.toStatus === "RECIBIDO")?.createdAt.toISOString() ?? null;

  const serialized = {
    id: order.id,
    status: order.status,
    totalAmount: order.totalAmount.toString(),
    createdAt: order.createdAt.toISOString(),
    confirmedAt,
    items: order.items.map((i) => ({
      id: i.id,
      productName: i.productName,
      unitPrice: i.unitPrice.toString(),
      quantity: i.quantity,
      categoryName: i.product?.category?.name ?? null,
      imageUrl: i.product?.imageUrl ?? null,
    })),
    statusHistory: order.statusHistory.map((h) => ({
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      createdAt: h.createdAt.toISOString(),
    })),
  };

  return (
    <OrderDetailClient
      order={serialized}
      userId={session!.user.id}
      avgTiempoSegundos={avgTiempoSegundos}
    />
  );
}
