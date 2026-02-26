import { useState } from 'react';
import { useFacturas, useClientes, useCreateFactura, useDeleteFactura, useRegistrarPago } from '@/hooks/useData';
import { formatCurrency } from '@/lib/kpi';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, CheckCircle, Search, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { exportFacturasCSV } from '@/lib/export';

export default function Facturas() {
  const { data: facturas = [] } = useFacturas();
  const { data: clientes = [] } = useClientes();
  const createFactura = useCreateFactura();
  const deleteFactura = useDeleteFactura();
  const registrarPago = useRegistrarPago();
  const { role } = useAuth();

  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ cliente_id: '', monto: '', fecha_emision: '', fecha_vencimiento: '' });

  const filtered = facturas.filter(f => {
    const clienteNombre = (f.cliente as any)?.nombre || '';
    if (search && !clienteNombre.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterEstado !== 'all' && f.estado !== filterEstado) return false;
    return true;
  });

  const estadoColor = (estado: string) => {
    switch (estado) {
      case 'pagada': return 'bg-risk-good-bg text-risk-good';
      case 'vencida': return 'bg-risk-critical-bg text-risk-critical';
      default: return 'bg-accent text-accent-foreground';
    }
  };

  const handleCreate = async () => {
    if (!form.cliente_id || !form.monto || !form.fecha_emision || !form.fecha_vencimiento) {
      toast.error('Todos los campos son requeridos');
      return;
    }
    try {
      await createFactura.mutateAsync({
        cliente_id: form.cliente_id,
        monto: Number(form.monto),
        fecha_emision: form.fecha_emision,
        fecha_vencimiento: form.fecha_vencimiento,
        estado: 'pendiente',
      });
      toast.success('Factura creada');
      setDialogOpen(false);
      setForm({ cliente_id: '', monto: '', fecha_emision: '', fecha_vencimiento: '' });
    } catch { toast.error('Error al crear factura'); }
  };

  const handlePago = async (facturaId: string) => {
    try {
      await registrarPago.mutateAsync({ facturaId, fechaPago: new Date().toISOString().split('T')[0] });
      toast.success('Pago registrado');
    } catch { toast.error('Error al registrar pago'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Facturas</h1>
          <p className="text-muted-foreground">{facturas.length} facturas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportFacturasCSV(facturas)}>
            <Download className="mr-2 h-4 w-4" />CSV
          </Button>
          {role === 'admin' && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Nueva Factura</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva Factura</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Cliente</Label>
                <Select value={form.cliente_id} onValueChange={v => setForm(f => ({ ...f, cliente_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                  <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Monto</Label><Input type="number" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} /></div>
              <div><Label>Fecha Emisión</Label><Input type="date" value={form.fecha_emision} onChange={e => setForm(f => ({ ...f, fecha_emision: e.target.value }))} /></div>
              <div><Label>Fecha Vencimiento</Label><Input type="date" value={form.fecha_vencimiento} onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleCreate} disabled={createFactura.isPending}>Crear Factura</Button>
            </div>
          </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="vencida">Vencida</SelectItem>
            <SelectItem value="pagada">Pagada</SelectItem>
            <SelectItem value="parcial">Parcial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Emisión</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(f => (
                <TableRow key={f.id}>
                  <TableCell>
                    <Link to={`/clientes/${f.cliente_id}`} className="font-medium text-primary hover:underline">
                      {(f.cliente as any)?.nombre || f.cliente_id}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatCurrency(f.monto)}</TableCell>
                  <TableCell>{format(parseISO(f.fecha_emision), 'dd/MM/yy')}</TableCell>
                  <TableCell>{format(parseISO(f.fecha_vencimiento), 'dd/MM/yy')}</TableCell>
                  <TableCell>{f.fecha_pago ? format(parseISO(f.fecha_pago), 'dd/MM/yy') : '—'}</TableCell>
                  <TableCell><Badge className={estadoColor(f.estado)}>{f.estado}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {f.estado !== 'pagada' && (
                        <Button variant="ghost" size="icon" onClick={() => handlePago(f.id)} title="Registrar pago">
                          <CheckCircle className="h-4 w-4 text-risk-good" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => { deleteFactura.mutate(f.id); toast.success('Eliminada'); }}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No se encontraron facturas</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
