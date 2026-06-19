import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; payment_id?: string }>;
}

export default async function ResultadoPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const { status, payment_id } = await searchParams;

  // Verify payment with MP and confirm order if approved
  if (status === "approved" && payment_id) {
    try {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
        cache: "no-store",
      });

      if (mpRes.ok) {
        const payment = await mpRes.json();
        if (payment.status === "approved") {
          const order = await db.order.findUnique({ where: { id } });
          if (order && order.status === "BORRADOR") {
            await db.order.update({
              where: { id },
              data: {
                paymentStatus: "PAGADO",
                mpPaymentId: String(payment_id),
                status: "RECIBIDO",
                statusHistory: {
                  create: {
                    fromStatus: "BORRADOR",
                    toStatus: "RECIBIDO",
                    changedByUserId: order.userId,
                  },
                },
              },
            });
          }
        }
      }
    } catch (err) {
      console.error("[resultado/mp]", err);
    }
  }

  const isApproved = status === "approved";
  const isPending = status === "pending";
  const isRejected = status === "rejected" || (!isApproved && !isPending);

  return (
    <div className="max-w-md mx-auto px-4 py-12 flex flex-col items-center text-center space-y-6">
      {isApproved && (
        <>
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-green-700">¡Pago aprobado!</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Tu pedido fue confirmado y está siendo procesado.
            </p>
          </div>
          <Link href={`/cliente/pedido/${id}`} className="w-full">
            <Button className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white">
              Ver mi pedido
            </Button>
          </Link>
        </>
      )}

      {isPending && (
        <>
          <div className="h-20 w-20 rounded-full bg-yellow-100 flex items-center justify-center">
            <Clock className="h-10 w-10 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-yellow-700">Pago en proceso</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Tu pago está siendo verificado. Te notificaremos cuando se confirme.
            </p>
          </div>
          <Link href="/cliente" className="w-full">
            <Button variant="outline" className="w-full">
              Volver al inicio
            </Button>
          </Link>
        </>
      )}

      {isRejected && (
        <>
          <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-red-700">Pago no aprobado</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              El pago fue rechazado. Podés intentar de nuevo o elegir otro método.
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full">
            <Link href={`/cliente/pedido/${id}/pago`} className="w-full">
              <Button className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white">
                Reintentar pago
              </Button>
            </Link>
            <Link href="/cliente" className="w-full">
              <Button variant="outline" className="w-full">
                Volver al inicio
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
