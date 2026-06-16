"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Search, Clock, Package, ClipboardList, Timer } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Papa from "papaparse";

interface PedidoHistorial {
  id: string; clienteNombre: string; operadorNombre: string;
  totalAmount: string; cantidadItems: number;
  confirmedAt: string | null; completedAt: string | null;
  tiempoEsperaSegundos: number | null;
  tiempoPreparacionSegundos: number | null;
  tiempoTotalSegundos: number | null;
}

function formatMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function avgSegundos(pedidos: PedidoHistorial[], key: keyof PedidoHistorial): number | null {
  const vals = pedidos.map((p) => p[key] as number | null).filter((v): v is number => v != null);
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
}

const today = new Date().toISOString().slice(0, 10);

export default function HistorialClient({ empleados }: { empleados: { id: string; name: string; legajo: number }[] }) {
  const [pedidos, setPedidos] = useState<PedidoHistorial[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [operadorId, setOperadorId] = useState("all");
  const [montoMin, setMontoMin] = useState("");
  const [montoMax, setMontoMax] = useState("");

  const fetchHistorial = async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    if (operadorId !== "all") params.set("operadorId", operadorId);
    if (montoMin) params.set("montoMin", montoMin);
    if (montoMax) params.set("montoMax", montoMax);
    const res = await fetch(`/api/admin/historial?${params}`);
    const data = await res.json();
    setPedidos(data.pedidos);
    setTotal(data.total);
    setLoading(false);
  };

  useEffect(() => { fetchHistorial(); }, []);

  const handleExport = () => {
    const csv = Papa.unparse(pedidos.map((p) => ({
      ID: p.id.slice(-6).toUpperCase(),
      Cliente: p.clienteNombre,
      Operador: p.operadorNombre,
      "Total (ARS)": p.totalAmount,
      Productos: p.cantidadItems,
      "Hora llegada": p.confirmedAt ? formatDate(p.confirmedAt) : "—",
      "Espera en RECIBIDO (mm:ss)": p.tiempoEsperaSegundos != null ? formatMMSS(p.tiempoEsperaSegundos) : "—",
      Completado: p.completedAt ? formatDate(p.completedAt) : "—",
      "Tiempo preparación (mm:ss)": p.tiempoPreparacionSegundos != null ? formatMMSS(p.tiempoPreparacionSegundos) : "—",
      "Tiempo total (mm:ss)": p.tiempoTotalSegundos != null ? formatMMSS(p.tiempoTotalSegundos) : "—",
    })));
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })),
      download: `historial-${new Date().toISOString().slice(0, 10)}.csv`,
    });
    a.click();
  };

  const totalMonto = pedidos.reduce((sum, p) => sum + parseFloat(p.totalAmount), 0);
  const avgEsperaTotal = avgSegundos(pedidos, "tiempoTotalSegundos");
  const avgPreparacion = avgSegundos(pedidos, "tiempoPreparacionSegundos");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Historial de pedidos</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{total} pedidos terminados</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={pedidos.length === 0} className="gap-2">
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end p-4 bg-white border border-[var(--border)] rounded-xl">
        <div className="space-y-1">
          <Label className="text-xs text-[var(--muted-foreground)]">Desde</Label>
          <Input
            type="date" value={desde} className="w-40" max={today}
            onChange={(e) => {
              const v = e.target.value;
              setDesde(v);
              if (hasta && hasta < v) setHasta("");
            }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--muted-foreground)]">Hasta</Label>
          <Input
            type="date" value={hasta} className="w-40"
            min={desde || undefined} max={today}
            onChange={(e) => setHasta(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--muted-foreground)]">Operador</Label>
          <Select value={operadorId} onValueChange={setOperadorId}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {empleados.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--muted-foreground)]">Monto mínimo</Label>
          <Input type="number" placeholder="$0" value={montoMin} onChange={(e) => setMontoMin(e.target.value)} className="w-32" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--muted-foreground)]">Monto máximo</Label>
          <Input type="number" placeholder="Sin límite" value={montoMax} onChange={(e) => setMontoMax(e.target.value)} className="w-32" />
        </div>
        <Button onClick={fetchHistorial} className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white gap-2">
          <Search className="h-4 w-4" /> Filtrar
        </Button>
      </div>

      {/* KPIs del resultado */}
      {!loading && pedidos.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="border-[var(--border)]">
            <CardContent className="p-4 flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-blue-500 bg-blue-50 p-1.5 rounded-lg shrink-0" />
              <div><p className="text-xl font-bold">{pedidos.length}</p><p className="text-xs text-[var(--muted-foreground)]">Pedidos en el filtro</p></div>
            </CardContent>
          </Card>
          <Card className="border-[var(--border)]">
            <CardContent className="p-4 flex items-center gap-3">
              <Package className="h-8 w-8 text-green-500 bg-green-50 p-1.5 rounded-lg shrink-0" />
              <div><p className="text-xl font-bold text-[var(--primary)]">{formatCurrency(totalMonto)}</p><p className="text-xs text-[var(--muted-foreground)]">Monto total</p></div>
            </CardContent>
          </Card>
          <Card className="border-[var(--border)]">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-500 bg-orange-50 p-1.5 rounded-lg shrink-0" />
              <div>
                <p className="text-xl font-bold font-mono">{avgEsperaTotal != null ? formatMMSS(avgEsperaTotal) : "—"}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Promedio espera total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[var(--border)]">
            <CardContent className="p-4 flex items-center gap-3">
              <Timer className="h-8 w-8 text-purple-500 bg-purple-50 p-1.5 rounded-lg shrink-0" />
              <div>
                <p className="text-xl font-bold font-mono">{avgPreparacion != null ? formatMMSS(avgPreparacion) : "—"}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Promedio preparación</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-[var(--muted)] hover:bg-[var(--muted)]">
              <TableHead className="pl-4">ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Operador</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Prods.</TableHead>
              <TableHead>Llegó</TableHead>
              <TableHead className="text-center">Espera</TableHead>
              <TableHead>Completado</TableHead>
              <TableHead className="text-right pr-4">Preparación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : pedidos.map((p) => (
                  <TableRow key={p.id} className="hover:bg-[var(--muted)]/50">
                    <TableCell className="pl-4">
                      <Badge variant="outline" className="font-mono text-xs">{p.id.slice(-6).toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{p.clienteNombre}</TableCell>
                    <TableCell className="text-[var(--muted-foreground)]">{p.operadorNombre}</TableCell>
                    <TableCell className="text-right font-semibold text-[var(--primary)]">{formatCurrency(p.totalAmount)}</TableCell>
                    <TableCell className="text-center">{p.cantidadItems}</TableCell>
                    <TableCell className="text-sm text-[var(--muted-foreground)] whitespace-nowrap">
                      {p.confirmedAt ? formatDate(p.confirmedAt) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.tiempoEsperaSegundos != null
                        ? <span className={`inline-flex items-center gap-1 text-sm font-medium font-mono ${p.tiempoEsperaSegundos > 600 ? "text-red-600" : p.tiempoEsperaSegundos > 300 ? "text-orange-500" : "text-green-600"}`}>
                            <Clock className="h-3 w-3" />{formatMMSS(p.tiempoEsperaSegundos)}
                          </span>
                        : <span className="text-[var(--muted-foreground)]">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--muted-foreground)] whitespace-nowrap">
                      {p.completedAt ? formatDate(p.completedAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      {p.tiempoPreparacionSegundos != null
                        ? <span className="flex items-center justify-end gap-1 text-sm font-mono"><Clock className="h-3 w-3 text-[var(--muted-foreground)]" />{formatMMSS(p.tiempoPreparacionSegundos)}</span>
                        : <span className="text-[var(--muted-foreground)]">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
            {!loading && pedidos.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16 text-[var(--muted-foreground)]">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No hay pedidos con los filtros seleccionados</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
