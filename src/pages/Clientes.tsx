import { useState } from 'react';
import { useClientes, useAsesores, useCreateCliente, useDeleteCliente, useUpdateCliente, useFacturas } from '@/hooks/useData';
import { calcClienteKPI, formatCurrency, formatPercent } from '@/lib/kpi';
import { RiskBadge } from '@/components/RiskBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Trash2, Download, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { RiskLevel } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { exportClientesCSV } from '@/lib/export';
import { Switch } from '@/components/ui/switch';

export default function Clientes() {
  const { data: clientes = [] } = useClientes();
  const { data: asesores = [] } = useAsesores();
  const { data: facturas = [] } = useFacturas();
  const createCliente = useCreateCliente();
  const deleteCliente = useDeleteCliente();
  const updateCliente = useUpdateCliente();
  const { role } = useAuth();

  const [search, setSearch] = useState('');
  const [filterAsesor, setFilterAsesor] = useState<string>('all');
  const [filterRiesgo, setFilterRiesgo] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [grupoDialog, setGrupoDialog] = useState(false);
  const [showGrupos, setShowGrupos] = useState(false);
  const [form, setForm] = useState({ nombre: '', asesor_id: '', linea_credito: '', es_grupo: false, parent_cliente_id: '' });
  const [grupoForm, setGrupoForm] = useState({ cliente_id: '', parent_cliente_id: '' });

  const clienteKPIs = clientes.map(c => calcClienteKPI(c, facturas));

  // Filter logic: in group mode, show only parent groups with consolidated KPIs
  const grupos = clientes.filter(c => c.es_grupo || clientes.some(sc => sc.parent_cliente_id === c.id));

  const filtered = clienteKPIs.filter(k => {
    if (showGrupos) {
      // Only show root-level clients (not sub-clients) or grupo parents
      if (k.cliente.parent_cliente_id) return false;
    }
    if (search && !k.cliente.nombre.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterAsesor !== 'all' && k.cliente.asesor_id !== filterAsesor) return false;
    if (filterRiesgo !== 'all' && k.riesgo !== filterRiesgo) return false;
    return true;
  });

  // Consolidated KPI for grupos
  const getConsolidatedKPI = (parentId: string) => {
    const subs = clientes.filter(c => c.parent_cliente_id === parentId);
    const allIds = [parentId, ...subs.map(c => c.id)];
    const groupFacturas = facturas.filter(f => allIds.includes(f.cliente_id));
    const totalFacturado = groupFacturas.reduce((s, f) => s + f.monto, 0);
    const montoVencido = groupFacturas.filter(f => f.estado === 'vencida' || f.estado === 'parcial').reduce((s, f) => s + f.monto, 0);
    return { totalFacturado, montoVencido, subCount: subs.length };
  };

  const handleCreate = async () => {
    if (!form.nombre) { toast.error('Nombre es requerido'); return; }
    try {
      await createCliente.mutateAsync({
        nombre: form.nombre,
        asesor_id: form.asesor_id || null,
        linea_credito: Number(form.linea_credito) || 0,
        es_grupo: form.es_grupo,
        parent_cliente_id: form.parent_cliente_id || null,
      });
      toast.success('Cliente creado');
      setDialogOpen(false);
      setForm({ nombre: '', asesor_id: '', linea_credito: '', es_grupo: false, parent_cliente_id: '' });
    } catch { toast.error('Error al crear cliente'); }
  };

  const handleAssignGrupo = async () => {
    if (!grupoForm.cliente_id || !grupoForm.parent_cliente_id) { toast.error('Selecciona cliente y grupo'); return; }
    try {
      await updateCliente.mutateAsync({ id: grupoForm.cliente_id, parent_cliente_id: grupoForm.parent_cliente_id });
      toast.success('Cliente asignado al grupo');
      setGrupoDialog(false);
      setGrupoForm({ cliente_id: '', parent_cliente_id: '' });
    } catch { toast.error('Error al asignar grupo'); }
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
            <>
              <Dialog open={grupoDialog} onOpenChange={setGrupoDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline"><Users className="mr-2 h-4 w-4" />Asignar Grupo</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Asignar Cliente a Grupo</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Cliente</Label>
                      <Select value={grupoForm.cliente_id} onValueChange={v => setGrupoForm(f => ({ ...f, cliente_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                        <SelectContent>{clientes.filter(c => !c.es_grupo).map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Grupo (cliente madre)</Label>
                      <Select value={grupoForm.parent_cliente_id} onValueChange={v => setGrupoForm(f => ({ ...f, parent_cliente_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar grupo" /></SelectTrigger>
                        <SelectContent>{clientes.filter(c => c.es_grupo || clientes.some(sc => sc.parent_cliente_id === c.id)).map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" onClick={handleAssignGrupo}>Asignar</Button>
                  </div>
                </DialogContent>
              </Dialog>
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
                    <div className="flex items-center gap-3">
                      <Switch checked={form.es_grupo} onCheckedChange={v => setForm(f => ({ ...f, es_grupo: v }))} />
                      <Label>Es cliente grupo (madre)</Label>
                    </div>
                    {!form.es_grupo && grupos.length > 0 && (
                      <div><Label>Grupo (opcional)</Label>
                        <Select value={form.parent_cliente_id} onValueChange={v => setForm(f => ({ ...f, parent_cliente_id: v }))}>
                          <SelectTrigger><SelectValue placeholder="Sin grupo" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Sin grupo</SelectItem>
                            {grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button className="w-full" onClick={handleCreate} disabled={createCliente.isPending}>Crear Cliente</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
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
        <div className="flex items-center gap-2">
          <Switch checked={showGrupos} onCheckedChange={setShowGrupos} />
          <Label className="text-sm">Vista grupos</Label>
        </div>
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
                <TableHead className="text-right">Uso Línea</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length > 0 ? filtered.map(k => {
                const subCount = clientes.filter(c => c.parent_cliente_id === k.cliente.id).length;
                return (
                  <TableRow key={k.cliente.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link to={`/clientes/${k.cliente.id}`} className="font-medium text-primary hover:underline">{k.cliente.nombre}</Link>
                        {(k.cliente.es_grupo || subCount > 0) && <Badge variant="outline" className="text-xs"><Users className="mr-1 h-3 w-3" />{subCount}</Badge>}
                        {k.cliente.parent_cliente_id && <Badge variant="outline" className="text-xs">Sub</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{(k.cliente as any).asesor?.nombre || '—'}</TableCell>
                    <TableCell><RiskBadge risk={k.riesgo} dpd={k.dpd} size="sm" /></TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(k.cliente.linea_credito)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(k.totalFacturado)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(k.montoVencido)}</TableCell>
                    <TableCell className="text-right tabular-nums">{k.dpd}d</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPercent(k.usoLinea)}</TableCell>
                    <TableCell>
                      {role === 'admin' && (
                      <Button variant="ghost" size="icon" onClick={() => { deleteCliente.mutate(k.cliente.id); toast.success('Eliminado'); }}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No se encontraron clientes</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
