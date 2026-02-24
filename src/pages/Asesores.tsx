import { useState } from 'react';
import { useAsesores, useCreateAsesor, useDeleteAsesor, useClientes, useFacturas } from '@/hooks/useData';
import { calcAsesorKPI, formatCurrency, formatPercent } from '@/lib/kpi';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function Asesores() {
  const { data: asesores = [] } = useAsesores();
  const { data: clientes = [] } = useClientes();
  const { data: facturas = [] } = useFacturas();
  const createAsesor = useCreateAsesor();
  const deleteAsesor = useDeleteAsesor();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ nombre: '', email: '' });

  const asesorKPIs = asesores.map(a => calcAsesorKPI(a, clientes, facturas));

  const handleCreate = async () => {
    if (!form.nombre || !form.email) { toast.error('Todos los campos son requeridos'); return; }
    try {
      await createAsesor.mutateAsync(form);
      toast.success('Asesor creado');
      setDialogOpen(false);
      setForm({ nombre: '', email: '' });
    } catch { toast.error('Error al crear asesor'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asesores</h1>
          <p className="text-muted-foreground">{asesores.length} asesores</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Nuevo Asesor</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo Asesor</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nombre</Label><Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleCreate} disabled={createAsesor.isPending}>Crear Asesor</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asesor</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Clientes</TableHead>
                <TableHead className="text-right">Cartera</TableHead>
                <TableHead className="text-right">Vencido</TableHead>
                <TableHead className="text-right">% Vencido</TableHead>
                <TableHead className="text-right">DPD Prom.</TableHead>
                <TableHead className="text-right">En Riesgo</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {asesorKPIs.map(k => (
                <TableRow key={k.asesor.id}>
                  <TableCell>
                    <Link to={`/asesores/${k.asesor.id}`} className="font-medium text-primary hover:underline">{k.asesor.nombre}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{k.asesor.email}</TableCell>
                  <TableCell className="text-right tabular-nums">{k.totalClientes}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(k.totalCartera)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(k.montoVencido)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPercent(k.porcentajeVencido)}</TableCell>
                  <TableCell className="text-right tabular-nums">{k.promedioDPD}d</TableCell>
                  <TableCell className="text-right">
                    {k.clientesEnRiesgo > 0 && (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-risk-critical-bg text-xs font-bold text-risk-critical">{k.clientesEnRiesgo}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => { deleteAsesor.mutate(k.asesor.id); toast.success('Eliminado'); }}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {asesorKPIs.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No hay asesores registrados</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
