"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingCart, ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function EmployeeLoginForm() {
  const router = useRouter();
  const [legajo, setLegajo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const isBlocked = attempts >= 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) return;

    setError("");
    setLoading(true);

    const result = await signIn("employee", {
      legajo,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setAttempts((prev) => prev + 1);
      setError("Legajo o contraseña incorrectos.");
    } else {
      // Fetch session to get the actual role and redirect accordingly
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      if (session?.user?.role === "ADMINISTRADOR") {
        router.push("/admin");
      } else {
        router.push("/operador");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="bg-[var(--primary)] p-2 rounded-xl">
              <ShoppingCart className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">SuperMarket</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Acceso para empleados</p>
        </div>

        <Card className="border-[var(--border)] shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Ingresá con tu legajo</CardTitle>
            <CardDescription>Operadores y administradores</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="legajo">Legajo</Label>
                <Input
                  id="legajo"
                  type="number"
                  placeholder="12345"
                  value={legajo}
                  onChange={(e) => setLegajo(e.target.value)}
                  required
                  disabled={isBlocked || loading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isBlocked || loading}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-[var(--destructive)] bg-red-50 border border-red-200 rounded-md p-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {isBlocked && (
                <div className="text-sm text-[var(--destructive)] bg-red-50 border border-red-200 rounded-md p-3">
                  Demasiados intentos fallidos. Intentá de nuevo en 15 minutos.
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white"
                disabled={isBlocked || loading}
              >
                {loading ? "Ingresando..." : "Ingresar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
