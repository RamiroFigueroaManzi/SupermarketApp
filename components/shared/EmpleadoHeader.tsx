"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, LogOut } from "lucide-react";

interface Props {
  user: { name?: string | null; legajo?: number };
  role: string;
}

export default function EmpleadoHeader({ user, role }: Props) {
  return (
    <header className="border-b border-[var(--border)] bg-white sticky top-0 z-40">
      <div className="container max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-[var(--primary)] p-1.5 rounded-lg">
            <ShoppingCart className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-semibold text-sm">SuperMarket</span>
            <span className="text-xs text-[var(--muted-foreground)] ml-2">· {role}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">{user.name}</p>
            {user.legajo && (
              <p className="text-xs text-[var(--muted-foreground)]">Legajo {user.legajo}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="gap-2 text-[var(--muted-foreground)]"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
