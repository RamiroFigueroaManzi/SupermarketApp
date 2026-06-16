"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, LogOut, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Props {
  user: { name?: string | null; legajo?: number };
}

export default function AdminHeader({ user }: Props) {
  return (
    <header className="h-16 border-b border-[var(--border)] bg-white sticky top-0 z-40 flex items-center px-6 gap-4 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 w-56 shrink-0">
        <div className="bg-[var(--primary)] p-1.5 rounded-lg">
          <ShoppingCart className="h-5 w-5 text-white" />
        </div>
        <div className="leading-tight">
          <p className="font-bold text-sm">SuperMarket</p>
          <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide">Administración</p>
        </div>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex-1" />

      {/* User info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-[var(--muted)] rounded-lg px-3 py-1.5">
          <User className="h-4 w-4 text-[var(--muted-foreground)]" />
          <div className="text-right leading-tight">
            <p className="text-sm font-medium">{user.name}</p>
            {user.legajo && (
              <p className="text-[11px] text-[var(--muted-foreground)]">Legajo {user.legajo}</p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="gap-2 text-[var(--muted-foreground)] h-9"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </header>
  );
}
