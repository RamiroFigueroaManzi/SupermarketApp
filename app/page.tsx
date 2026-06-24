import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, Cpu, CreditCard, Clock } from "lucide-react";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    const role = session.user.role;
    if (role === "cliente") redirect("/cliente");
    if (role === "OPERADOR") redirect("/operador");
    if (role === "ADMINISTRADOR") redirect("/admin");
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="bg-green-600 p-1.5 rounded-lg">
            <ShoppingCart className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg">SuperMarket</span>
        </div>
        <Link
          href="/login"
          className="text-sm font-medium text-green-700 hover:text-green-800 transition-colors"
        >
          Ingresar
        </Link>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-2xl mx-auto">
        <div className="bg-green-600 p-4 rounded-2xl mb-6">
          <ShoppingCart className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Tu supermercado digital
        </h1>
        <p className="text-lg text-gray-600 mb-8 max-w-lg">
          Realizá tus pedidos de supermercado desde el celular. Describí lo que necesitás y la IA arma el pedido por vos. Retirás en el local.
        </p>
        <Link
          href="/login"
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-xl text-base transition-colors"
        >
          Hacer un pedido
        </Link>
      </section>

      {/* Features */}
      <section className="border-t bg-gray-50 py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="bg-green-100 p-3 rounded-xl">
              <Cpu className="h-6 w-6 text-green-700" />
            </div>
            <h3 className="font-semibold text-gray-900">Pedidos con IA</h3>
            <p className="text-sm text-gray-500">
              Escribí tu lista o sacá una foto y la IA detecta y mapea los productos automáticamente.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="bg-green-100 p-3 rounded-xl">
              <CreditCard className="h-6 w-6 text-green-700" />
            </div>
            <h3 className="font-semibold text-gray-900">Pagos integrados</h3>
            <p className="text-sm text-gray-500">
              Pagá con Mercado Pago o en efectivo al retirar. Simple, rápido y seguro.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="bg-green-100 p-3 rounded-xl">
              <Clock className="h-6 w-6 text-green-700" />
            </div>
            <h3 className="font-semibold text-gray-900">Seguimiento en tiempo real</h3>
            <p className="text-sm text-gray-500">
              Seguí el estado de tu pedido en vivo: recibido, en preparación o listo para retirar.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} SuperMarket · Todos los derechos reservados
      </footer>
    </main>
  );
}
