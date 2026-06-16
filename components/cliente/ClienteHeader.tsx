"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ShoppingCart, LogOut } from "lucide-react";

interface Props {
  user: { name?: string | null; email?: string | null; image?: string | null };
}

export default function ClienteHeader({ user }: Props) {
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <header className="border-b border-[var(--border)] bg-white sticky top-0 z-40">
      <div className="container max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-[var(--primary)] p-1.5 rounded-lg">
            <ShoppingCart className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-sm">SuperMarket</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.image || ""} alt={user.name || ""} />
                <AvatarFallback className="bg-[var(--primary)] text-white text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 border-b border-[var(--border)] mb-1">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-[var(--muted-foreground)] truncate">{user.email}</p>
            </div>
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/" })}
              className="gap-2 text-[var(--destructive)] focus:text-[var(--destructive)]"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
