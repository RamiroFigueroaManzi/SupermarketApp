import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const categoria = searchParams.get("categoria");
  const q = searchParams.get("q");
  const activo = searchParams.get("activo") !== "false";

  const where: any = { isActive: activo };
  if (categoria) where.categoryId = categoria;
  if (q) where.name = { contains: q, mode: "insensitive" };

  const [productos, total] = await Promise.all([
    db.product.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.product.count({ where }),
  ]);

  return NextResponse.json({
    productos: productos.map((p) => ({ ...p, price: p.price.toString() })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { name, description, price, categoryId, imageUrl } = await req.json();
  if (!name || !price || !categoryId) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const product = await db.product.create({
    data: { name, description, price, categoryId, ...(imageUrl !== undefined && { imageUrl }) },
    include: { category: { select: { id: true, name: true } } },
  });

  revalidateTag("catalog", "max");
  return NextResponse.json(
    { producto: { ...product, price: product.price.toString() } },
    { status: 201 }
  );
}
