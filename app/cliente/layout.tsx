import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ClienteSidebar from "@/components/cliente/ClienteSidebar";
import { Toaster } from "@/components/ui/sonner";

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "cliente") redirect("/");

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      <ClienteSidebar user={session.user} />
      {/* En móvil el sidebar es top-bar fijo de 56px, en desktop es lateral */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>
      <Toaster richColors position="top-center" />
    </div>
  );
}
