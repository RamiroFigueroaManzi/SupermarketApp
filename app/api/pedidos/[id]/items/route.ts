import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/pedidos/[id]/items">) {
  const session = await auth();
  if (!session || session.user.role !== "cliente") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const order = await db.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (order.userId !== session.user.id) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  if (order.status !== "BORRADOR") return NextResponse.json({ error: "Pedido ya confirmado" }, { status: 400 });

  const { productId, quantity } = await req.json();
  const product = await db.product.findFirst({ where: { id: productId, isActive: true } });
  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 400 });

  const item = await db.orderItem.create({
    data: {
      orderId: id,
      productId: product.id,
      productName: product.name,
      unitPrice: product.price,
      quantity,
    },
  });

  // Recalculate total
  const allItems = await db.orderItem.findMany({ where: { orderId: id } });
  const totalAmount = allItems.reduce(
    (sum, i) => sum + Number(i.unitPrice) * i.quantity,
    0
  );
  await db.order.update({ where: { id }, data: { totalAmount } });

  return NextResponse.json(
    { item: { ...item, unitPrice: item.unitPrice.toString() } },
    { status: 201 }
  );
}
