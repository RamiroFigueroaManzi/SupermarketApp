import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const categorias = await db.category.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ categorias });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const categoria = await db.category.create({ data: { name } });
  return NextResponse.json({ categoria }, { status: 201 });
}
