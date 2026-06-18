import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

export const getAvgTiempoTotalSegundos = unstable_cache(
  async (): Promise<number | null> => {
    const orders = await db.order.findMany({
      where: { status: { in: ["LISTO", "TERMINADO"] } },
      include: {
        statusHistory: {
          where: { toStatus: { in: ["RECIBIDO", "LISTO"] } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    const tiempos = orders
      .map((o) => {
        const recibido = o.statusHistory.find((h) => h.toStatus === "RECIBIDO")?.createdAt;
        const listo = o.statusHistory.find((h) => h.toStatus === "LISTO")?.createdAt;
        if (!recibido || !listo) return null;
        return Math.round((listo.getTime() - recibido.getTime()) / 1000);
      })
      .filter((t): t is number => t != null && t > 0);

    if (tiempos.length === 0) return null;
    return Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length);
  },
  ["avg-tiempo-total-pedido"],
  { revalidate: 300, tags: ["orders"] }
);

export function calcRetiroEstimado(
  confirmedAt: string,
  avgSegundos: number
): string {
  const base = new Date(confirmedAt).getTime();
  const margen = 3 * 60 * 1000;
  const avgMs = avgSegundos * 1000;
  const desde = new Date(base + avgMs - margen);
  const hasta = new Date(base + avgMs + margen);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return `${fmt(desde)} – ${fmt(hasta)}`;
}
