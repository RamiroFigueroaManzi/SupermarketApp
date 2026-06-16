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

  const dateFilter: any = {};
  if (desde) dateFilter.gte = new Date(desde);
  if (hasta) dateFilter.lte = new Date(hasta);

  const whereCompleted: any = { status: { in: ["LISTO", "TERMINADO"] } };
  if (desde || hasta) whereCompleted.updatedAt = dateFilter;

  // Fetch completed orders with history for timing
  const orders = await db.order.findMany({
    where: whereCompleted,
    include: {
      operador: { select: { id: true, name: true, legajo: true } },
      items: {
        include: {
          product: {
            select: { id: true, name: true, category: { select: { id: true, name: true } } },
          },
        },
      },
      statusHistory: {
        where: { toStatus: { in: ["EN_PREPARACION", "LISTO"] } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Operadores stats
  const operadorMap: Record<string, any> = {};
  for (const o of orders) {
    if (!o.operador) continue;
    const empId = o.operador.id;
    if (!operadorMap[empId]) {
      operadorMap[empId] = {
        id: empId,
        nombre: o.operador.name,
        legajo: o.operador.legajo,
        totalPedidos: 0,
        tiempos: [] as number[],
      };
    }
    operadorMap[empId].totalPedidos++;

    const startedAt = o.statusHistory.find((h) => h.toStatus === "EN_PREPARACION")?.createdAt;
    const readyAt = o.statusHistory.find((h) => h.toStatus === "LISTO")?.createdAt;
    if (startedAt && readyAt) {
      const mins = (readyAt.getTime() - startedAt.getTime()) / 60000;
      operadorMap[empId].tiempos.push(mins);
    }
  }

  const operadores = Object.values(operadorMap).map((emp: any) => ({
    id: emp.id,
    nombre: emp.nombre,
    legajo: emp.legajo,
    totalPedidos: emp.totalPedidos,
    tiempoPromedioMinutos:
      emp.tiempos.length > 0
        ? Math.round(emp.tiempos.reduce((a: number, b: number) => a + b, 0) / emp.tiempos.length * 10) / 10
        : null,
  }));

  // Productos más vendidos
  const productMap: Record<string, any> = {};
  for (const o of orders) {
    for (const item of o.items) {
      const pid = item.productId || item.productName;
      if (!productMap[pid]) {
        productMap[pid] = {
          productId: item.productId,
          nombre: item.productName,
          categoria: item.product?.category?.name ?? "Sin categoría",
          totalVendido: 0,
          montoTotal: 0,
        };
      }
      productMap[pid].totalVendido += item.quantity;
      productMap[pid].montoTotal += Number(item.unitPrice) * item.quantity;
    }
  }

  const productosMasVendidos = Object.values(productMap)
    .sort((a: any, b: any) => b.totalVendido - a.totalVendido)
    .slice(0, 10)
    .map((p: any) => ({ ...p, montoTotal: p.montoTotal.toFixed(2) }));

  // Ventas por categoría
  const catMap: Record<string, any> = {};
  for (const o of orders) {
    for (const item of o.items) {
      const catName = item.product?.category?.name ?? "Sin categoría";
      const catId = item.product?.category?.id ?? "sin-cat";
      if (!catMap[catId]) {
        catMap[catId] = { categoriaId: catId, nombre: catName, totalItems: 0, montoTotal: 0 };
      }
      catMap[catId].totalItems += item.quantity;
      catMap[catId].montoTotal += Number(item.unitPrice) * item.quantity;
    }
  }

  const ventasPorCategoria = Object.values(catMap)
    .sort((a: any, b: any) => b.montoTotal - a.montoTotal)
    .map((c: any) => ({ ...c, montoTotal: c.montoTotal.toFixed(2) }));

  return NextResponse.json({ operadores, productosMasVendidos, ventasPorCategoria });
}
