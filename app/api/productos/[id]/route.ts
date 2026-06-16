import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/productos/[id]">) {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await req.json();

  const product = await db.product.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.price && { price: body.price }),
      ...(body.categoryId && { categoryId: body.categoryId }),
      ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl || null }),
    },
    include: { category: { select: { id: true, name: true } } },
  });

  revalidateTag("catalog", "max");
  return NextResponse.json({ producto: { ...product, price: product.price.toString() } });
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/productos/[id]">) {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await ctx.params;

  const pedidosActivos = await db.orderItem.count({
    where: {
      productId: id,
      order: { status: { in: ["RECIBIDO", "EN_PREPARACION", "LISTO"] } },
    },
  });

  await db.product.update({ where: { id }, data: { isActive: false } });

  revalidateTag("catalog", "max");
  return NextResponse.json({ message: "Producto desactivado", pedidosActivos });
}
