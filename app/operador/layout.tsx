import { auth } from "@/auth";
import { redirect } from "next/navigation";
import EmpleadoHeader from "@/components/shared/EmpleadoHeader";
import { Toaster } from "@/components/ui/sonner";

export default async function OperadorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || !["OPERADOR", "ADMINISTRADOR"].includes(session.user.role)) redirect("/");

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <EmpleadoHeader user={session.user} role="Operador" />
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-6">
        {children}
      </main>
      <Toaster richColors position="top-center" />
    </div>
  );
}
