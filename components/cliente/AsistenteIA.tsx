"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ChefHat, Users, ShoppingBasket, ArrowRight } from "lucide-react";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface Ingrediente {
  productId: string;
  productoNombre: string;
  cantidad: number;
  unidad: string;
  precio: string;
  categoria: string;
  imageUrl: string | null;
}

interface Receta {
  nombre: string;
  descripcion: string;
  porciones: number;
  ingredientes: Ingrediente[];
}

const EJEMPLOS = [
  "Necesito ingredientes para un almuerzo rápido y rico para 2 personas",
  "¿Qué puedo hacer para el desayuno de toda la semana?",
];

export default function AsistenteIA() {
  const router = useRouter();
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [eligiendo, setEligiendo] = useState<number | null>(null);

  const handleConsultar = async () => {
    if (!mensaje.trim()) return;
    setLoading(true);
    setRecetas([]);
    try {
      const res = await fetch("/api/cliente/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al consultar al asistente");
        return;
      }
      setRecetas(data.recetas);
    } catch {
      toast.error("Error de conexión. Reintentá.");
    } finally {
      setLoading(false);
    }
  };

  const handleElegir = (receta: Receta, idx: number) => {
    setEligiendo(idx);
    // Map recipe ingredients to the NuevoPedidoForm AIItem shape
    const items = receta.ingredientes.map((ing) => ({
      productoId: ing.productId,
      nombreDetectado: ing.productoNombre,
      productoNombre: ing.productoNombre,
      precio: ing.precio,
      cantidad: ing.cantidad,
      confianza: "alta" as const,
      categoria: ing.categoria,
      imageUrl: ing.imageUrl,
    }));
    sessionStorage.setItem("pedido_prefill", JSON.stringify(items));
    router.push("/cliente/pedido/nuevo");
  };

  const totalReceta = (receta: Receta) =>
    receta.ingredientes.reduce(
      (sum, ing) => sum + parseFloat(ing.precio || "0") * ing.cantidad,
      0
    );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Asistente de compras</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          Contame qué necesitás y te sugiero recetas con los productos del supermercado
        </p>
      </div>

      {/* Input */}
      <div className="space-y-3">
        <Textarea
          placeholder="Ej: Quiero preparar una cena para 4 personas, que sea vegetariana y fácil de hacer..."
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          rows={4}
          className="resize-none"
          disabled={loading}
        />

        {/* Ejemplos rápidos */}
        {!mensaje && !loading && recetas.length === 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-[var(--muted-foreground)]">Probá con:</p>
            <div className="flex flex-col gap-1.5">
              {EJEMPLOS.map((ej) => (
                <button
                  key={ej}
                  onClick={() => setMensaje(ej)}
                  className="text-left text-xs px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                >
                  {ej}
                </button>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={handleConsultar}
          disabled={!mensaje.trim() || loading}
          className="w-full h-12 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white gap-2"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Buscando recetas...</>
          ) : (
            <><Sparkles className="h-4 w-4" /> Sugerirme recetas</>
          )}
        </Button>
      </div>

      {/* Recetas */}
      {recetas.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            Recetas sugeridas
          </h2>
          {recetas.map((receta, idx) => (
            <Card key={idx} className="border-[var(--border)]">
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base">{receta.nombre}</h3>
                    <p className="text-sm text-[var(--muted-foreground)] mt-0.5 leading-snug">
                      {receta.descripcion}
                    </p>
                  </div>
                  <Badge className="bg-orange-50 text-orange-700 border-0 shrink-0 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {receta.porciones} porciones
                  </Badge>
                </div>

                {/* Ingredientes */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                    Ingredientes ({receta.ingredientes.length})
                  </p>
                  <div className="space-y-1.5">
                    {receta.ingredientes.map((ing, iIdx) => (
                      <div key={iIdx} className="flex items-center gap-2.5">
                        <div className="relative h-9 w-9 shrink-0 rounded-lg bg-gray-50 border border-[var(--border)] overflow-hidden flex items-center justify-center">
                          {ing.imageUrl ? (
                            <Image
                              src={ing.imageUrl}
                              alt={ing.productoNombre}
                              fill
                              className="object-contain p-0.5"
                              sizes="36px"
                              unoptimized
                            />
                          ) : (
                            <ShoppingBasket className="h-4 w-4 text-[var(--muted-foreground)] opacity-40" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ing.productoNombre}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">{ing.categoria}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold">x{ing.cantidad} {ing.unidad}</p>
                          <p className="text-xs text-[var(--primary)]">
                            {formatCurrency(parseFloat(ing.precio) * ing.cantidad)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                  <div>
                    <p className="text-xs text-[var(--muted-foreground)]">Total estimado</p>
                    <p className="font-bold text-[var(--primary)]">{formatCurrency(totalReceta(receta))}</p>
                  </div>
                  <Button
                    onClick={() => handleElegir(receta, idx)}
                    disabled={eligiendo !== null}
                    className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white gap-2"
                  >
                    {eligiendo === idx ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>Elegir esta receta <ArrowRight className="h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            variant="ghost"
            onClick={() => { setRecetas([]); setMensaje(""); }}
            className="w-full text-[var(--muted-foreground)]"
          >
            Volver a buscar
          </Button>
        </div>
      )}
    </div>
  );
}
