import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Package, Users, ClipboardList, BarChart3, TrendingUp, ShoppingBag, Clock } from "lucide-react";

const getDashboardStats = unstable_cache(
  async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [terminadosHoy, pedidosActivos, totalProductos, totalEmpleados, pedidosSemana] =
      await Promise.all([
        db.order.count({ where: { status: { in: ["LISTO", "TERMINADO"] }, updatedAt: { gte: today } } }),
        db.order.count({ where: { status: { in: ["RECIBIDO", "EN_PREPARACION"] } } }),
        db.product.count({ where: { isActive: true } }),
        db.employee.count({ where: { isActive: true } }),
        db.order.count({
          where: {
            status: { in: ["LISTO", "TERMINADO"] },
            updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);
    return { terminadosHoy, pedidosActivos, totalProductos, totalEmpleados, pedidosSemana };
  },
  ["admin-dashboard"],
  { revalidate: 30, tags: ["orders"] }
);

export default async function AdminDashboard() {
  const { terminadosHoy, pedidosActivos, totalProductos, totalEmpleados, pedidosSemana } =
    await getDashboardStats();

  const stats = [
    { label: "Pedidos terminados hoy", value: terminadosHoy, icon: ShoppingBag, color: "text-green-600", bg: "bg-green-50" },
    { label: "Pedidos en curso", value: pedidosActivos, icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Pedidos esta semana", value: pedidosSemana, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Empleados activos", value: totalEmpleados, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  const shortcuts = [
    { href: "/admin/catalogo", label: "Catálogo de productos", desc: `${totalProductos} productos activos`, Icon: Package, color: "bg-green-500" },
    { href: "/admin/empleados", label: "Empleados", desc: `${totalEmpleados} empleados activos`, Icon: Users, color: "bg-purple-500" },
    { href: "/admin/historial", label: "Historial de pedidos", desc: "Filtrar y exportar a CSV", Icon: ClipboardList, color: "bg-blue-500" },
    { href: "/admin/estadisticas", label: "Estadísticas", desc: "Rendimiento y ventas", Icon: BarChart3, color: "bg-orange-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Panel de administración</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-[var(--border)]">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`${bg} p-3 rounded-xl`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5 leading-tight">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-4 gap-4">
          {shortcuts.map(({ href, label, desc, Icon, color }) => (
            <Link key={href} href={href}>
              <Card className="border-[var(--border)] hover:shadow-md hover:border-[var(--primary)] transition-all cursor-pointer group h-full">
                <CardContent className="p-5">
                  <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <p className="font-semibold text-sm group-hover:text-[var(--primary)] transition-colors">{label}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">{desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
