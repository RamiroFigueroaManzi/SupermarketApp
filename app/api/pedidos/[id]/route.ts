import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { emitOrderStatusChanged, emitOrdersListUpdated } from "@/lib/socket";
import { OrderStatus } from "@prisma/client";
import { revalidateTag } from "next/cache";

const ALLOWED_TRANSITIONS: Record<string, { to: OrderStatus; roles: string[] }[]> = {
  BORRADOR: [{ to: "RECIBIDO", roles: ["cliente"] }],
  RECIBIDO: [{ to: "EN_PREPARACION", roles: ["OPERADOR", "ADMINISTRADOR"] }],
  EN_PREPARACION: [{ to: "LISTO", roles: ["OPERADOR", "ADMINISTRADOR"] }],
  LISTO: [{ to: "TERMINADO", roles: ["OPERADOR", "ADMINISTRADOR"] }],
};

export async function GET(req: NextRequest, ctx: RouteContext<"/api/pedidos/[id]">) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await ctx.params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      operador: { select: { id: true, name: true, legajo: true } },
      items: {
        include: {
          product: { select: { category: { select: { name: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
      statusHistory: {
        include: {
          changedByUser: { select: { name: true } },
          changedByEmployee: { select: { name: true, legajo: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  const role = session.user.role;
  if (role === "cliente" && order.userId !== session.user.id) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  return NextResponse.json({
    pedido: {
      ...order,
      totalAmount: order.totalAmount.toString(),
      items: order.items.map((i) => ({
        ...i,
        unitPrice: i.unitPrice.toString(),
        subtotal: (Number(i.unitPrice) * i.quantity).toString(),
        categoryName: i.product?.category?.name ?? null,
        product: undefined,
      })),
      statusHistory: order.statusHistory.map((h) => ({
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        actor: h.changedByUser?.name || h.changedByEmployee?.name || "Sistema",
        createdAt: h.createdAt,
      })),
    },
  });
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/pedidos/[id]">) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json();
  const role = session.user.role;

  const order = await db.order.findUnique({
    where: { id },
    include: { user: { select: { name: true } }, items: true },
  });

  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  // === Cambio de ítems (solo cliente, solo BORRADOR) ===
  if (body.items !== undefined) {
    if (role !== "cliente" || order.userId !== session.user.id) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }
    if (order.status !== "BORRADOR") {
      return NextResponse.json({ error: "Solo se puede editar un pedido en borrador" }, { status: 400 });
    }

    const productIds = body.items.map((i: any) => i.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    const newItems = body.items.map((item: any) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw new Error(`Producto ${item.productId} no encontrado`);
      return {
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
      };
    });

    const totalAmount = newItems.reduce(
      (sum: number, i: any) => sum + Number(i.unitPrice) * i.quantity,
      0
    );

    await db.orderItem.deleteMany({ where: { orderId: id } });
    const updated = await db.order.update({
      where: { id },
      data: { totalAmount, items: { create: newItems } },
      include: { items: true },
    });

    return NextResponse.json({
      pedido: {
        ...updated,
        totalAmount: updated.totalAmount.toString(),
        items: updated.items.map((i) => ({ ...i, unitPrice: i.unitPrice.toString() })),
      },
    });
  }

  // === Cambio de estado ===
  if (body.status !== undefined) {
    const newStatus = body.status as OrderStatus;
    const transitions = ALLOWED_TRANSITIONS[order.status] || [];
    const allowed = transitions.find((t) => t.to === newStatus && t.roles.includes(role));

    if (!allowed) {
      return NextResponse.json({ error: "Transición de estado no permitida" }, { status: 400 });
    }

    if (role === "cliente" && order.userId !== session.user.id) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    // Verificar límite de 3 pedidos simultáneos para operadores
    if (newStatus === "EN_PREPARACION" && (role === "OPERADOR" || role === "ADMINISTRADOR")) {
      const activeCount = await db.order.count({
        where: { operadorId: session.user.id, status: "EN_PREPARACION" },
      });
      if (activeCount >= 3) {
        return NextResponse.json(
          { error: "Límite de pedidos simultáneos alcanzado", code: "MAX_ORDERS_REACHED" },
          { status: 409 }
        );
      }
    }

    const updateData: any = { status: newStatus };
    if (newStatus === "EN_PREPARACION") updateData.operadorId = session.user.id;

    const isEmployee = session.user.isEmployee;
    const updated = await db.order.update({
      where: { id },
      data: {
        ...updateData,
        statusHistory: {
          create: {
            fromStatus: order.status,
            toStatus: newStatus,
            changedByUserId: isEmployee ? null : session.user.id,
            changedByEmployeeId: isEmployee ? session.user.id : null,
          },
        },
      },
      include: { items: true, user: { select: { name: true } } },
    });

    // Invalidar caché de órdenes
    revalidateTag("orders", "max");

    // Emitir eventos Socket.io
    emitOrderStatusChanged(order.userId, id, newStatus);
    emitOrdersListUpdated({
      pedidoId: id,
      estado: newStatus,
      clienteNombre: updated.user.name || "",
      cantidadItems: updated.items.length,
    });

    return NextResponse.json({
      pedido: {
        ...updated,
        totalAmount: updated.totalAmount.toString(),
        items: updated.items.map((i) => ({ ...i, unitPrice: i.unitPrice.toString() })),
      },
    });
  }

  return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/pedidos/[id]">) {
  const session = await auth();
  if (!session || session.user.role !== "cliente") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const order = await db.order.findUnique({ where: { id } });

  if (!order) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (order.userId !== session.user.id) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  if (order.status !== "BORRADOR") {
    return NextResponse.json({ error: "Solo se puede eliminar un pedido en borrador" }, { status: 400 });
  }

  await db.order.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
