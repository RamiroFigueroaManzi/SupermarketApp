"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, ClipboardList, LogOut, Menu, Home, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  user: { name?: string | null; email?: string | null; image?: string | null };
}

function SidebarContent({ user, onNavigate }: Props & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const navItems = [
    { href: "/cliente", label: "Mis pedidos", icon: Home, exact: true },
    { href: "/cliente/historial", label: "Historial", icon: ClipboardList },
    { href: "/cliente/asistente", label: "Asistente IA", icon: Sparkles },
  ];

  return (
    <div className="flex flex-col h-full py-6 px-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-1 mb-6">
        <div className="bg-[var(--primary)] p-1.5 rounded-lg shrink-0">
          <ShoppingCart className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-base">SuperMarket</span>
      </div>

      {/* Navegación */}
      <nav className="space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
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

      <div className="flex-1" />
      <Separator className="mb-4" />

      {/* Módulo de sesión */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={user.image || ""} alt={user.name || ""} />
            <AvatarFallback className="bg-[var(--primary)] text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className="text-xs text-[var(--muted-foreground)] truncate">{user.email}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-[var(--muted-foreground)] justify-start"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}

export default function ClienteSidebar({ user }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Sidebar persistente en desktop */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-[var(--border)] bg-white sticky top-0 h-screen">
        <SidebarContent user={user} />
      </aside>

      {/* Top bar + drawer en móvil */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-[var(--border)] flex items-center px-4 gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-56 p-0">
            <VisuallyHidden><SheetTitle>Menú de navegación</SheetTitle></VisuallyHidden>
            <SidebarContent user={user} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <div className="bg-[var(--primary)] p-1 rounded-md">
            <ShoppingCart className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-sm">SuperMarket</span>
        </div>
      </div>
    </>
  );
}
