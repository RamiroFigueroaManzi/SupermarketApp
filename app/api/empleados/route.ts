import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { revalidateTag } from "next/cache";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const activo = searchParams.get("activo") !== "false";
  const rol = searchParams.get("rol");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: any = { isActive: activo };
  if (rol) where.role = rol;

  const [empleados, total] = await Promise.all([
    db.employee.findMany({
      where,
      select: { id: true, legajo: true, name: true, role: true, isActive: true, createdAt: true },
      orderBy: { legajo: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.employee.count({ where }),
  ]);

  return NextResponse.json({ empleados, total });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { legajo, name, password, role } = await req.json();
  if (!legajo || !name || !password || !role) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const exists = await db.employee.findUnique({ where: { legajo } });
  if (exists) {
    return NextResponse.json({ error: "El legajo ya existe" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const empleado = await db.employee.create({
    data: { legajo, name, passwordHash, role },
    select: { id: true, legajo: true, name: true, role: true, isActive: true, createdAt: true },
  });

  revalidateTag("employees", "max");
  return NextResponse.json({ empleado }, { status: 201 });
}
