"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Package, Users, ClipboardList, BarChart3 } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/catalogo", label: "Catálogo", icon: Package },
  { href: "/admin/empleados", label: "Empleados", icon: Users },
  { href: "/admin/historial", label: "Historial de pedidos", icon: ClipboardList },
  { href: "/admin/estadisticas", label: "Estadísticas", icon: BarChart3 },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r border-[var(--border)] bg-white shrink-0 flex flex-col">
      <nav className="flex-1 p-3 space-y-0.5">
        <p className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest px-3 pt-3 pb-2">
          Menú principal
        </p>
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[var(--border)]">
        <p className="text-[10px] text-[var(--muted-foreground)] text-center">
          SuperMarket Admin v1.0
        </p>
      </div>
    </aside>
  );
}
