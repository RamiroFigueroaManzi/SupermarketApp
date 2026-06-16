import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
    })
  ),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const role = session.user.role;
  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");

  if (role === "cliente") {
    const pedidos = await db.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
    const mapped = pedidos.map((p) => ({
      id: p.id,
      status: p.status,
      totalAmount: p.totalAmount.toString(),
      cantidadItems: p.items.length,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
    return NextResponse.json({ pedidos: mapped });
  }

  if (role === "OPERADOR" || role === "ADMINISTRADOR") {
    const whereStatus = statusFilter
      ? { status: statusFilter as any }
      : { status: { in: ["RECIBIDO", "EN_PREPARACION", "LISTO"] as any } };

    const pedidos = await db.order.findMany({
      where: whereStatus,
      orderBy: { updatedAt: "asc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { select: { id: true } },
      },
    });

    const mapped = pedidos.map((p) => ({
      id: p.id,
      status: p.status,
      totalAmount: p.totalAmount.toString(),
      clienteNombre: p.user.name || p.user.email,
      cantidadItems: p.items.length,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
    return NextResponse.json({ pedidos: mapped });
  }

  return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "cliente") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { items } = parsed.data;

  // Fetch products to get current prices
  const productIds = items.map((i) => i.productId);
  const products = await db.product.findMany({
    where: { id: { in: productIds }, isActive: true },
  });

  if (products.length !== productIds.length) {
    return NextResponse.json({ error: "Uno o más productos no existen" }, { status: 400 });
  }

  const orderItems = items.map((item) => {
    const product = products.find((p) => p.id === item.productId)!;
    return {
      productId: product.id,
      productName: product.name,
      unitPrice: product.price,
      quantity: item.quantity,
    };
  });

  const totalAmount = orderItems.reduce(
    (sum, i) => sum + Number(i.unitPrice) * i.quantity,
    0
  );

  const order = await db.order.create({
    data: {
      userId: session.user.id,
      totalAmount,
      items: { create: orderItems },
      statusHistory: {
        create: {
          fromStatus: null,
          toStatus: "BORRADOR",
          changedByUserId: session.user.id,
        },
      },
    },
    include: { items: true },
  });

  revalidateTag("orders", "max");
  return NextResponse.json(
    {
      pedido: {
        ...order,
        totalAmount: order.totalAmount.toString(),
        items: order.items.map((i) => ({
          ...i,
          unitPrice: i.unitPrice.toString(),
        })),
      },
    },
    { status: 201 }
  );
}
