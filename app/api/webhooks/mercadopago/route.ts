import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { emitOrderStatusChanged, emitOrdersListUpdated } from "@/lib/socket";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // MP sends either body.data.id or query param id
    const paymentId = body?.data?.id ?? new URL(req.url).searchParams.get("id");
    const type = body?.type ?? new URL(req.url).searchParams.get("type");

    if (type !== "payment" || !paymentId) {
      return NextResponse.json({ ok: true });
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });

    if (!mpRes.ok) return NextResponse.json({ ok: true });
    const payment = await mpRes.json();

    const orderId = payment.external_reference;
    if (!orderId) return NextResponse.json({ ok: true });

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { name: true } },
        items: { select: { id: true } },
      },
    });

    if (!order) return NextResponse.json({ ok: true });

    if (payment.status === "approved" && order.status === "BORRADOR") {
      await db.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "PAGADO",
          mpPaymentId: String(paymentId),
          status: "RECIBIDO",
          statusHistory: {
            create: {
              fromStatus: "BORRADOR",
              toStatus: "RECIBIDO",
              changedByUserId: order.userId,
            },
          },
        },
      });

      emitOrderStatusChanged(order.userId, orderId, "RECIBIDO");
      emitOrdersListUpdated({
        pedidoId: orderId,
        estado: "RECIBIDO",
        clienteNombre: order.user.name || "",
        cantidadItems: order.items.length,
      });
    } else if (payment.status === "rejected") {
      await db.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "FALLIDO",
          mpPaymentId: String(paymentId),
        },
      });
    }
  } catch (err) {
    console.error("[webhook/mp]", err);
  }

  return NextResponse.json({ ok: true });
}
