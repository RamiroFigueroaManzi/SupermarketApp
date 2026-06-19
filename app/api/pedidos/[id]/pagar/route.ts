import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { emitOrderStatusChanged, emitOrdersListUpdated } from "@/lib/socket";
import MercadoPagoConfig, { Preference } from "mercadopago";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/pedidos/[id]/pagar">) {
  const session = await auth();
  if (!session || session.user.role !== "cliente") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const { method } = await req.json();

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      user: { select: { name: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  if (order.userId !== session.user.id) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  if (order.status !== "BORRADOR") return NextResponse.json({ error: "El pedido ya fue procesado" }, { status: 400 });

  if (method === "EFECTIVO") {
    await db.order.update({
      where: { id },
      data: {
        paymentMethod: "EFECTIVO",
        paymentStatus: "PENDIENTE",
        status: "RECIBIDO",
        statusHistory: {
          create: {
            fromStatus: "BORRADOR",
            toStatus: "RECIBIDO",
            changedByUserId: session.user.id,
          },
        },
      },
    });

    emitOrderStatusChanged(session.user.id, id, "RECIBIDO");
    emitOrdersListUpdated({
      pedidoId: id,
      estado: "RECIBIDO",
      clienteNombre: order.user.name || "",
      cantidadItems: order.items.length,
    });

    return NextResponse.json({ ok: true });
  }

  if (method === "MERCADO_PAGO") {
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
    const preference = new Preference(client);

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const result = await preference.create({
      body: {
        items: [
          {
            id: order.id,
            title: `Pedido #${order.id.slice(-6).toUpperCase()} - Supermercado`,
            quantity: 1,
            unit_price: Number(order.totalAmount),
            currency_id: "ARS",
          },
        ],
        back_urls: {
          success: `${baseUrl}/cliente/pedido/${id}/pago/resultado?status=approved`,
          failure: `${baseUrl}/cliente/pedido/${id}/pago/resultado?status=rejected`,
          pending: `${baseUrl}/cliente/pedido/${id}/pago/resultado?status=pending`,
        },
        notification_url: `${baseUrl}/api/webhooks/mercadopago`,
        external_reference: id,
      },
    });

    await db.order.update({
      where: { id },
      data: {
        paymentMethod: "MERCADO_PAGO",
        mpPreferenceId: result.id ?? null,
      },
    });

    return NextResponse.json({ checkoutUrl: result.init_point });
  }

  return NextResponse.json({ error: "Método de pago inválido" }, { status: 400 });
}
