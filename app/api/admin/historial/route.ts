import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const operadorId = searchParams.get("operadorId");
  const montoMin = searchParams.get("montoMin");
  const montoMax = searchParams.get("montoMax");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  // LISTO = pedido completado (no hace falta llegar a TERMINADO)
  const where: any = { status: { in: ["LISTO", "TERMINADO"] } };
  if (desde || hasta) {
    where.updatedAt = {};
    if (desde) where.updatedAt.gte = new Date(desde);
    if (hasta) {
      const hastaDate = new Date(hasta);
      hastaDate.setHours(23, 59, 59, 999);
      where.updatedAt.lte = hastaDate;
    }
  }
  if (operadorId) where.operadorId = operadorId;
  if (montoMin || montoMax) {
    where.totalAmount = {};
    if (montoMin) where.totalAmount.gte = parseFloat(montoMin);
    if (montoMax) where.totalAmount.lte = parseFloat(montoMax);
  }

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        operador: { select: { name: true, legajo: true } },
        items: { select: { id: true } },
        statusHistory: {
          where: { toStatus: { in: ["RECIBIDO", "EN_PREPARACION", "LISTO"] } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.order.count({ where }),
  ]);

  const pedidos = orders.map((o) => {
    const confirmedAt = o.statusHistory.find((h) => h.toStatus === "RECIBIDO")?.createdAt;
    const startedAt = o.statusHistory.find((h) => h.toStatus === "EN_PREPARACION")?.createdAt;
    const completedAt = o.statusHistory.find((h) => h.toStatus === "LISTO")?.createdAt;

    const tiempoEspera =
      confirmedAt && startedAt
        ? Math.round((startedAt.getTime() - confirmedAt.getTime()) / 60000)
        : null;

    const tiempoPreparacion =
      startedAt && completedAt
        ? Math.round((completedAt.getTime() - startedAt.getTime()) / 60000)
        : null;

    return {
      id: o.id,
      clienteNombre: o.user.name || o.user.email,
      operadorNombre: o.operador?.name ?? "—",
      operadorLegajo: o.operador?.legajo ?? null,
      totalAmount: o.totalAmount.toString(),
      cantidadItems: o.items.length,
      confirmedAt: confirmedAt?.toISOString() ?? null,
      completedAt: completedAt?.toISOString() ?? null,
      tiempoEsperaMinutos: tiempoEspera,
      tiempoPreparacionMinutos: tiempoPreparacion,
    };
  });

  return NextResponse.json({ pedidos, total, page });
}
