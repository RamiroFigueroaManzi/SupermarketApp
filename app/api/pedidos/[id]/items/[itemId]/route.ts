import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/pedidos/[id]/items/[itemId]">
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id, itemId } = await ctx.params;
  const body = await req.json();
  const role = session.user.role;

  const order = await db.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Cliente: cambiar cantidad (solo BORRADOR)
  if (body.quantity !== undefined && role === "cliente") {
    if (order.userId !== session.user.id || order.status !== "BORRADOR") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }
    const item = await db.orderItem.update({
      where: { id: itemId, orderId: id },
      data: { quantity: body.quantity },
    });
    // Recalc total
    const allItems = await db.orderItem.findMany({ where: { orderId: id } });
    const totalAmount = allItems.reduce(
      (sum, i) => sum + Number(i.unitPrice) * i.quantity,
      0
    );
    await db.order.update({ where: { id }, data: { totalAmount } });
    return NextResponse.json({ item: { ...item, unitPrice: item.unitPrice.toString() } });
  }

  // Operador: cambiar isChecked (solo EN_PREPARACION)
  if (body.isChecked !== undefined && (role === "OPERADOR" || role === "ADMINISTRADOR")) {
    if (order.status !== "EN_PREPARACION") {
      return NextResponse.json({ error: "Pedido no en preparación" }, { status: 400 });
    }
    const item = await db.orderItem.update({
      where: { id: itemId, orderId: id },
      data: { isChecked: body.isChecked },
    });
    return NextResponse.json({ item: { ...item, unitPrice: item.unitPrice.toString() } });
  }

  return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
}

export async function DELETE(
  req: NextRequest,
  ctx: RouteContext<"/api/pedidos/[id]/items/[itemId]">
) {
  const session = await auth();
  if (!session || session.user.role !== "cliente") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id, itemId } = await ctx.params;
  const order = await db.order.findUnique({ where: { id } });
  if (!order || order.userId !== session.user.id || order.status !== "BORRADOR") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  await db.orderItem.delete({ where: { id: itemId, orderId: id } });

  const allItems = await db.orderItem.findMany({ where: { orderId: id } });
  const totalAmount = allItems.reduce(
    (sum, i) => sum + Number(i.unitPrice) * i.quantity,
    0
  );
  await db.order.update({ where: { id }, data: { totalAmount } });

  return new NextResponse(null, { status: 204 });
}
