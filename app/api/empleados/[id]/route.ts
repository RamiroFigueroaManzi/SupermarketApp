import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { revalidateTag } from "next/cache";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/empleados/[id]">) {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await req.json();

  // Prevent admin from deactivating themselves
  if (body.isActive === false && id === session.user.id) {
    return NextResponse.json({ error: "No podés desactivar tu propio usuario" }, { status: 403 });
  }

  const updateData: any = {};
  if (body.name) updateData.name = body.name;
  if (body.role) updateData.role = body.role;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;
  if (body.password) updateData.passwordHash = await bcrypt.hash(body.password, 12);

  const empleado = await db.employee.update({
    where: { id },
    data: updateData,
    select: { id: true, legajo: true, name: true, role: true, isActive: true },
  });

  revalidateTag("employees", "max");
  return NextResponse.json({ empleado });
}
