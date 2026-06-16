import HistorialClient from "@/components/admin/HistorialClient";
import { db } from "@/lib/db";

export default async function HistorialPage() {
  const empleados = await db.employee.findMany({
    where: { isActive: true, role: "OPERADOR" },
    select: { id: true, name: true, legajo: true },
    orderBy: { name: "asc" },
  });
  return <HistorialClient empleados={empleados} />;
}
