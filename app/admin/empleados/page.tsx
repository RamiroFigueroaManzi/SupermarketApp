import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import EmpleadosClient from "@/components/admin/EmpleadosClient";

const getEmpleados = unstable_cache(
  async () => {
    const rows = await db.employee.findMany({
      orderBy: { legajo: "asc" },
      select: { id: true, legajo: true, name: true, role: true, isActive: true, createdAt: true },
    });
    // Convertir Date → string dentro del caché para que sea serializable
    return rows.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }));
  },
  ["admin-employees"],
  { revalidate: 120, tags: ["employees"] }
);

export default async function EmpleadosPage() {
  const empleados = await getEmpleados();
  return <EmpleadosClient initialEmpleados={empleados} />;
}
