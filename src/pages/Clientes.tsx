import { useState } from 'react';
import { useClientes, useAsesores, useCreateCliente, useDeleteCliente } from '@/hooks/useData';
import { useFacturas } from '@/hooks/useData';
import { calcClienteKPI, formatCurrency, formatPercent } from '@/lib/kpi';
import { RiskBadge } from '@/components/RiskBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, Trash2, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { RiskLevel } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { exportClientesCSV } from '@/lib/export';

export default function Clientes() {
  const { data: clientes = [] } = useClientes();
  const { data: asesores = [] } = useAsesores();
  const { data: facturas = [] } = useFacturas();
  const createCliente = useCreateCliente();
  const deleteCliente = useDeleteCliente();
  const { role } = useAuth();

  const [search, setSearch] = useState('');
  const [filterAsesor, setFilterAsesor] = useState<string>('all');
  const [filterRiesgo, setFilterRiesgo] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ nombre: '', asesor_id: '', linea_credito: '' });

  const clienteKPIs = clientes.map(c => calcClienteKPI(c, facturas));

  const filtered = clienteKPIs.filter(k => {
    if (search && !k.cliente.nombre.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterAsesor !== 'all' && k.cliente.asesor_id !== filterAsesor) return false;
    if (filterRiesgo !== 'all' && k.riesgo !== filterRiesgo) return false;
    return true;
  });

  const handleCreate = async () => {
    if (!form.nombre) { toast.error('Nombre es requerido'); return; }
    try {
      await createCliente.mutateAsync({
        nombre: form.nombre,
        asesor_id: form.asesor_id || null,
        linea_credito: Number(form.linea_credito) || 0,
      });
      toast.success('Cliente creado');
      setDialogOpen(false);
      setForm({ nombre: '', asesor_id: '', linea_credito: '' });
    } catch { toast.error('Error al crear cliente'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">{clientes.length} clientes registrados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportClientesCSV(clienteKPIs)}>
            <Download className="mr-2 h-4 w-4" />CSV
          </Button>
          {role === 'admin' && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Nuevo Cliente</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo Cliente</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nombre</Label><Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></div>
              <div><Label>Asesor</Label>
                <Select value={form.asesor_id} onValueChange={v => setForm(f => ({ ...f, asesor_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar asesor" /></SelectTrigger>
                  <SelectContent>{asesores.map(a => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Línea de Crédito</Label><Input type="number" value={form.linea_credito} onChange={e => setForm(f => ({ ...f, linea_credito: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleCreate} disabled={createCliente.isPending}>Crear Cliente</Button>
            </div>
          </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterAsesor} onValueChange={setFilterAsesor}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Asesor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los asesores</SelectItem>
            {asesores.map(a => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterRiesgo} onValueChange={setFilterRiesgo}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Riesgo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="bueno">Bueno</SelectItem>
            <SelectItem value="malo">Malo</SelectItem>
            <SelectItem value="muy_malo">Muy Malo</SelectItem>
            <SelectItem value="pesimo">Pésimo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Asesor</TableHead>
                <TableHead>Riesgo</TableHead>
                <TableHead className="text-right">Línea de Crédito</TableHead>
                <TableHead className="text-right">Facturado</TableHead>
                <TableHead className="text-right">Vencido</TableHead>
                <TableHead className="text-right">DPD</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length > 0 ? filtered.map(k => (
                <TableRow key={k.cliente.id}>
                  <TableCell>
                    <Link to={`/clientes/${k.cliente.id}`} className="font-medium text-primary hover:underline">{k.cliente.nombre}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{(k.cliente as any).asesor?.nombre || '—'}</TableCell>
                  <TableCell><RiskBadge risk={k.riesgo} dpd={k.dpd} size="sm" /></TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(k.cliente.linea_credito)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(k.totalFacturado)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(k.montoVencido)}</TableCell>
                  <TableCell className="text-right tabular-nums">{k.dpd}d</TableCell>
                  <TableCell>
                    {role === 'admin' && (
                    <Button variant="ghost" size="icon" onClick={() => { deleteCliente.mutate(k.cliente.id); toast.success('Eliminado'); }}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    )}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No se encontraron clientes</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
