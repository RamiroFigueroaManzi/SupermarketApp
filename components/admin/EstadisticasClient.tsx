"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Search, Clock, ShoppingBag, BarChart3, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const COLORS = ["#16a34a", "#f97316", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#ef4444"];

interface Stats {
  operadores: { id: string; nombre: string; legajo: number; totalPedidos: number; tiempoPromedioMinutos: number | null }[];
  productosMasVendidos: { productId: string | null; nombre: string; categoria: string; totalVendido: number; montoTotal: string }[];
  ventasPorCategoria: { categoriaId: string; nombre: string; totalItems: number; montoTotal: string }[];
}

const today = new Date().toISOString().slice(0, 10);

export default function EstadisticasClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const fetchStats = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    const res = await fetch(`/api/admin/estadisticas?${params}`);
    setStats(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estadísticas</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Rendimiento operativo y ventas</p>
        </div>
      </div>

      {/* Filtro de fechas */}
      <div className="flex gap-3 items-end p-4 bg-white border border-[var(--border)] rounded-xl">
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
        <Button onClick={fetchStats} className="gap-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white">
          <Search className="h-4 w-4" /> Aplicar filtro
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      ) : stats && (
        <div className="space-y-6">
          {/* Sección 1: Rendimiento operadores */}
          <div>
            <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
              <ShoppingBag className="h-4 w-4" /> Rendimiento de operadores
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Gráfico */}
              <Card className="border-[var(--border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Pedidos por operador</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.operadores} barSize={32}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="nombre" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ borderRadius: 8, border: "1px solid var(--border)" }} />
                        <Bar dataKey="totalPedidos" name="Pedidos" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Tabla detallada */}
              <Card className="border-[var(--border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Detalle por operador</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[var(--muted)]">
                        <TableHead className="pl-4">Operador</TableHead>
                        <TableHead className="text-center">Pedidos</TableHead>
                        <TableHead className="text-right pr-4">Tiempo prom.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.operadores.map((op) => (
                        <TableRow key={op.id}>
                          <TableCell className="pl-4 font-medium">{op.nombre}</TableCell>
                          <TableCell className="text-center font-semibold text-[var(--primary)]">{op.totalPedidos}</TableCell>
                          <TableCell className="text-right pr-4">
                            <span className="flex items-center justify-end gap-1 text-sm">
                              <Clock className="h-3 w-3 text-[var(--muted-foreground)]" />
                              {op.tiempoPromedioMinutos != null ? `${op.tiempoPromedioMinutos} min` : "—"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      {stats.operadores.length === 0 && (
                        <TableRow><TableCell colSpan={3} className="text-center py-6 text-[var(--muted-foreground)] text-sm">Sin datos</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Sección 2: Ventas */}
          <div>
            <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
              <TrendingUp className="h-4 w-4" /> Análisis de ventas
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Torta categorías */}
              <Card className="border-[var(--border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Ventas por categoría</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.ventasPorCategoria.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-sm text-[var(--muted-foreground)]">Sin datos para el período</div>
                  ) : (
                    <>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats.ventasPorCategoria.map((c) => ({ ...c, montoTotal: parseFloat(c.montoTotal) }))}
                              dataKey="montoTotal"
                              nameKey="nombre"
                              cx="50%"
                              cy="50%"
                              outerRadius={95}
                              innerRadius={40}
                              paddingAngle={2}
                              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
                                if (percent < 0.06) return null;
                                const RADIAN = Math.PI / 180;
                                const r = innerRadius + (outerRadius - innerRadius) * 0.5;
                                const x = cx + r * Math.cos(-midAngle * RADIAN);
                                const y = cy + r * Math.sin(-midAngle * RADIAN);
                                return (
                                  <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
                                    {`${(percent * 100).toFixed(0)}%`}
                                  </text>
                                );
                              }}
                              labelLine={false}
                            >
                              {stats.ventasPorCategoria.map((_, idx) => (
                                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v: any) => formatCurrency(v)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 mt-3">
                        {stats.ventasPorCategoria.map((c, idx) => (
                          <div key={c.categoriaId} className="flex items-center gap-2 text-xs">
                            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLORS[idx % COLORS.length] }} />
                            <span className="text-[var(--foreground)] font-medium truncate">{c.nombre}</span>
                            <span className="text-[var(--muted-foreground)] ml-auto shrink-0">{formatCurrency(c.montoTotal)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Barras productos */}
              <Card className="border-[var(--border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Top 10 productos más vendidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.productosMasVendidos} layout="vertical" barSize={14}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="nombre" type="category" width={130} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ borderRadius: 8, border: "1px solid var(--border)" }} />
                        <Bar dataKey="totalVendido" name="Unidades vendidas" fill="#f97316" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
