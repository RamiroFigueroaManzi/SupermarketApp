"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Pencil, PowerOff, Users, ShieldCheck, Wrench } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface Empleado { id: string; legajo: number; name: string; role: string; isActive: boolean; createdAt: string }
const EMPTY_FORM = { legajo: "", name: "", password: "", role: "OPERADOR" };

export default function EmpleadosClient({ initialEmpleados }: { initialEmpleados: Empleado[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Empleado | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const operadores = initialEmpleados.filter((e) => e.role === "OPERADOR");
  const admins = initialEmpleados.filter((e) => e.role === "ADMINISTRADOR");

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (e: Empleado) => {
    setEditing(e);
    setForm({ legajo: String(e.legajo), name: e.name, password: "", role: e.role });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.role || (!editing && (!form.legajo || !form.password))) {
      toast.error("Completá los campos requeridos"); return;
    }
    setSaving(true);
    const res = editing
      ? await fetch(`/api/empleados/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, role: form.role, ...(form.password && { password: form.password }) }) })
      : await fetch("/api/empleados", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ legajo: parseInt(form.legajo), name: form.name, password: form.password, role: form.role }) });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); toast.error(d.error || "Error"); return; }
    toast.success(editing ? "Empleado actualizado" : "Empleado creado");
    setModalOpen(false);
    router.refresh();
  };

  const handleToggleActive = async (emp: Empleado) => {
    if (!confirm(`¿${emp.isActive ? "Desactivar" : "Activar"} a ${emp.name}?`)) return;
    const res = await fetch(`/api/empleados/${emp.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !emp.isActive }) });
    if (!res.ok) { const d = await res.json(); toast.error(d.error || "Error"); return; }
    toast.success(`Empleado ${emp.isActive ? "desactivado" : "activado"}`);
    router.refresh();
  };

  const EmpleadoTable = ({ empleados, title, icon: Icon }: { empleados: Empleado[]; title: string; icon: any }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
        <Icon className="h-4 w-4" />
        {title} ({empleados.length})
      </div>
      <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-[var(--muted)] hover:bg-[var(--muted)]">
              <TableHead className="pl-4">Legajo</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Alta</TableHead>
              <TableHead className="text-right pr-4">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empleados.map((emp) => (
              <TableRow key={emp.id} className={`hover:bg-[var(--muted)]/50 ${!emp.isActive ? "opacity-50" : ""}`}>
                <TableCell className="pl-4 font-mono font-semibold text-sm">{emp.legajo}</TableCell>
                <TableCell className="font-medium">{emp.name}</TableCell>
                <TableCell>
                  <Badge className={`text-xs border-0 ${emp.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {emp.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-[var(--muted-foreground)]">{formatDate(emp.createdAt)}</TableCell>
                <TableCell className="text-right pr-4">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600" onClick={() => openEdit(emp)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className={`h-8 w-8 ${emp.isActive ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-green-50 hover:text-green-600"}`}
                      onClick={() => handleToggleActive(emp)}
                    >
                      <PowerOff className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {empleados.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-[var(--muted-foreground)] text-sm">Sin empleados en este rol</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Empleados</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{initialEmpleados.filter(e => e.isActive).length} activos · {initialEmpleados.length} total</p>
        </div>
        <Button onClick={openCreate} className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white gap-2">
          <Plus className="h-4 w-4" /> Nuevo empleado
        </Button>
      </div>

      <EmpleadoTable empleados={admins} title="Administradores" icon={ShieldCheck} />
      <EmpleadoTable empleados={operadores} title="Operadores" icon={Wrench} />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[var(--primary)]" />
              {editing ? "Editar empleado" : "Nuevo empleado"}
            </DialogTitle>
          </DialogHeader>
          <Separator />
          <div className="grid grid-cols-2 gap-4 py-2">
            {!editing && (
              <div className="space-y-1.5">
                <Label>Legajo <span className="text-red-500">*</span></Label>
                <Input type="number" value={form.legajo} onChange={(e) => setForm({ ...form, legajo: e.target.value })} placeholder="12345" />
              </div>
            )}
            <div className={`space-y-1.5 ${!editing ? "" : "col-span-2"}`}>
              <Label>Nombre completo <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre Apellido" />
            </div>
            <div className="space-y-1.5">
              <Label>Rol <span className="text-red-500">*</span></Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPERADOR">Operador</SelectItem>
                  <SelectItem value="ADMINISTRADOR">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{editing ? "Nueva contraseña (opcional)" : "Contraseña"} {!editing && <span className="text-red-500">*</span>}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            </div>
          </div>
          <Separator />
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white">
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear empleado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
