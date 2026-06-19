import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import PagoForm from "@/components/cliente/PagoForm";

export default async function PagoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order || order.userId !== session.user.id) redirect("/cliente");
  if (order.status !== "BORRADOR") redirect(`/cliente/pedido/${id}`);

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <PagoForm
        orderId={id}
        total={order.totalAmount.toString()}
        cantidadItems={order.items.length}
      />
    </div>
  );
}
