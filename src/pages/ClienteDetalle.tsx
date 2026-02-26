import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useClientes, useAsesores, useFacturas, usePagosByCliente, useNotasCobranza, usePromesasPago, useCreatePago, useCreateNotaCobranza, useCreatePromesaPago, useUpdatePromesaPago } from '@/hooks/useData';
import { calcClienteKPI, formatCurrency, formatPercent } from '@/lib/kpi';
import { useAuth } from '@/hooks/useAuth';
import { RiskBadge } from '@/components/RiskBadge';
import { KPICard } from '@/components/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, DollarSign, Clock, TrendingUp, CreditCard, Plus, MessageSquare, Handshake, CalendarClock, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function ClienteDetalle() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: clientes = [] } = useClientes();
  const { data: facturas = [] } = useFacturas();
  const { data: asesores = [] } = useAsesores();
  const { data: pagos = [] } = usePagosByCliente(id || '');
  const { data: notas = [] } = useNotasCobranza(id || '');
  const { data: promesas = [] } = usePromesasPago(id || '');

  const createPago = useCreatePago();
  const createNota = useCreateNotaCobranza();
  const createPromesa = useCreatePromesaPago();
  const updatePromesa = useUpdatePromesaPago();

  const [pagoDialog, setPagoDialog] = useState(false);
  const [notaDialog, setNotaDialog] = useState(false);
  const [promesaDialog, setPromesaDialog] = useState(false);
  const [pagoForm, setPagoForm] = useState({ factura_id: '', monto: '', metodo: 'transferencia', referencia: '' });
  const [notaForm, setNotaForm] = useState({ tipo: 'nota', contenido: '' });
  const [promesaForm, setPromesaForm] = useState({ factura_id: '', monto_prometido: '', fecha_promesa: '', notas: '' });

  const cliente = clientes.find(c => c.id === id);
  if (!cliente) return <div className="py-12 text-center text-muted-foreground">Cliente no encontrado</div>;

  const kpi = calcClienteKPI(cliente, facturas);
  const clienteFacturas = facturas.filter(f => f.cliente_id === cliente.id);
  const asesor = asesores.find(a => a.id === cliente.asesor_id);

  // Score de cobranza (0-100)
  const scoreCobranza = Math.max(0, Math.min(100, Math.round(
    (kpi.porcentajePagoATiempo * 0.4) +
    (Math.max(0, 100 - kpi.frecuenciaAtraso) * 0.3) +
    (Math.max(0, 100 - kpi.dpd * 5) * 0.3)
  )));

  // Monto recuperado
  const montoRecuperado = pagos.reduce((s, p) => s + Number(p.monto), 0);

  // Días desde último pago
  const ultimoPago = pagos.length > 0 ? pagos[0] : null;
  const diasDesdeUltimoPago = ultimoPago ? differenceInDays(new Date(), parseISO(ultimoPago.fecha_pago)) : null;

  // Promesas activas
  const promesasActivas = promesas.filter(p => p.estado === 'pendiente');

  // Timeline events
  const timelineEvents = [
    ...pagos.map(p => ({ type: 'pago' as const, date: p.fecha_pago, title: `Pago: ${formatCurrency(Number(p.monto))}`, subtitle: `${p.metodo}${p.referencia ? ` · Ref: ${p.referencia}` : ''}`, id: p.id })),
    ...notas.map(n => ({ type: 'nota' as const, date: n.created_at.split('T')[0], title: n.tipo === 'contacto' ? 'Contacto registrado' : 'Nota de cobranza', subtitle: n.contenido, id: n.id })),
    ...promesas.map(p => ({ type: 'promesa' as const, date: p.fecha_promesa, title: `Promesa: ${formatCurrency(Number(p.monto_prometido))}`, subtitle: `${p.estado}${p.notas ? ` · ${p.notas}` : ''}`, id: p.id })),
    ...clienteFacturas.map(f => ({ type: 'factura' as const, date: f.fecha_emision, title: `Factura: ${formatCurrency(f.monto)}`, subtitle: `Vence: ${f.fecha_vencimiento} · ${f.estado}`, id: f.id })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const estadoColor = (estado: string) => {
    switch (estado) {
      case 'pagada': return 'bg-risk-good-bg text-risk-good';
      case 'vencida': return 'bg-risk-critical-bg text-risk-critical';
      case 'parcial': return 'bg-risk-bad-bg text-risk-bad';
      default: return 'bg-accent text-accent-foreground';
    }
  };

  const timelineIcon = (type: string) => {
    switch (type) {
      case 'pago': return <DollarSign className="h-4 w-4 text-risk-good" />;
      case 'nota': return <MessageSquare className="h-4 w-4 text-primary" />;
      case 'promesa': return <Handshake className="h-4 w-4 text-risk-bad" />;
      case 'factura': return <FileText className="h-4 w-4 text-muted-foreground" />;
      default: return null;
    }
  };

  // Sugerencias automáticas
  const sugerencias: string[] = [];
  if (kpi.dpd > 5) sugerencias.push('⚠️ Atraso significativo: considerar llamada de seguimiento inmediata.');
  if (kpi.frecuenciaAtraso > 50) sugerencias.push('🔄 Patrón de atraso recurrente: revisar condiciones de crédito.');
  if (kpi.usoLinea > 90) sugerencias.push('📊 Uso de línea cerca del límite: evaluar incremento o restricción.');
  if (promesasActivas.length > 0 && promesasActivas.some(p => differenceInDays(new Date(), parseISO(p.fecha_promesa)) > 0)) {
    sugerencias.push('❌ Promesa de pago vencida: dar seguimiento urgente.');
  }
  if (diasDesdeUltimoPago !== null && diasDesdeUltimoPago > 30) sugerencias.push('⏰ Más de 30 días sin pago: priorizar contacto.');

  const handleCreatePago = async () => {
    if (!pagoForm.factura_id || !pagoForm.monto) { toast.error('Factura y monto son requeridos'); return; }
    try {
      await createPago.mutateAsync({ factura_id: pagoForm.factura_id, monto: Number(pagoForm.monto), fecha_pago: new Date().toISOString().split('T')[0], metodo: pagoForm.metodo, referencia: pagoForm.referencia || undefined, registrado_por: user?.id });
      toast.success('Pago registrado');
      setPagoDialog(false);
      setPagoForm({ factura_id: '', monto: '', metodo: 'transferencia', referencia: '' });
    } catch { toast.error('Error al registrar pago'); }
  };

  const handleCreateNota = async () => {
    if (!notaForm.contenido) { toast.error('Contenido requerido'); return; }
    try {
      await createNota.mutateAsync({ cliente_id: cliente.id, tipo: notaForm.tipo, contenido: notaForm.contenido, registrado_por: user?.id });
      toast.success('Nota registrada');
      setNotaDialog(false);
      setNotaForm({ tipo: 'nota', contenido: '' });
    } catch { toast.error('Error al registrar nota'); }
  };

  const handleCreatePromesa = async () => {
    if (!promesaForm.monto_prometido || !promesaForm.fecha_promesa) { toast.error('Monto y fecha son requeridos'); return; }
    try {
      await createPromesa.mutateAsync({ cliente_id: cliente.id, factura_id: promesaForm.factura_id || undefined, monto_prometido: Number(promesaForm.monto_prometido), fecha_promesa: promesaForm.fecha_promesa, notas: promesaForm.notas || undefined, registrado_por: user?.id });
      toast.success('Promesa registrada');
      setPromesaDialog(false);
      setPromesaForm({ factura_id: '', monto_prometido: '', fecha_promesa: '', notas: '' });
    } catch { toast.error('Error al registrar promesa'); }
  };

  const pendientesFacturas = clienteFacturas.filter(f => f.estado !== 'pagada');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/clientes" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{cliente.nombre}</h1>
            <RiskBadge risk={kpi.riesgo} dpd={kpi.dpd} size="lg" />
            <Badge variant="outline" className={cliente.estado_credito === 'activo' ? 'border-risk-good text-risk-good' : 'border-risk-critical text-risk-critical'}>
              {cliente.estado_credito}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Asesor: {asesor?.nombre || 'Sin asignar'} · Ciclo: {cliente.ciclo_facturacion} · Corte: día {cliente.dia_corte} · Pago: día {cliente.dia_pago}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KPICard title="Total Facturado" value={formatCurrency(kpi.totalFacturado)} icon={DollarSign} />
        <KPICard title="Monto Vencido" value={formatCurrency(kpi.montoVencido)} icon={TrendingUp} variant="danger" />
        <KPICard title="DPD Promedio" value={`${kpi.dpd} días`} icon={Clock} variant={kpi.dpd > 5 ? 'danger' : kpi.dpd > 2 ? 'warning' : 'good'} />
        <KPICard title="Score Cobranza" value={`${scoreCobranza}/100`} icon={CreditCard} variant={scoreCobranza < 40 ? 'danger' : scoreCobranza < 70 ? 'warning' : 'good'} />
        <KPICard title="Recuperado" value={formatCurrency(montoRecuperado)} subtitle={diasDesdeUltimoPago !== null ? `Último pago: ${diasDesdeUltimoPago}d` : 'Sin pagos'} icon={DollarSign} variant="good" />
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Puntualidad</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold tabular-nums">{formatPercent(kpi.porcentajePagoATiempo)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Uso de Línea</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold tabular-nums">{formatPercent(kpi.usoLinea)}</p><p className="text-xs text-muted-foreground">Línea: {formatCurrency(cliente.linea_credito)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Promesas Activas</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold tabular-nums">{promesasActivas.length}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Freq. Atraso</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold tabular-nums">{formatPercent(kpi.frecuenciaAtraso)}</p></CardContent></Card>
      </div>

      {/* Sugerencias */}
      {sugerencias.length > 0 && (
        <Card className="border-risk-bad/30 bg-risk-bad-bg">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <AlertTriangle className="h-5 w-5 text-risk-bad" />
            <CardTitle className="text-sm">Sugerencias Automáticas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {sugerencias.map((s, i) => <li key={i} className="text-sm">{s}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Dialog open={pagoDialog} onOpenChange={setPagoDialog}>
          <DialogTrigger asChild><Button><DollarSign className="mr-2 h-4 w-4" />Registrar Pago</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Pago</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Factura</Label>
                <Select value={pagoForm.factura_id} onValueChange={v => setPagoForm(f => ({ ...f, factura_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar factura" /></SelectTrigger>
                  <SelectContent>{pendientesFacturas.map(f => <SelectItem key={f.id} value={f.id}>{formatCurrency(f.monto)} - Vence: {f.fecha_vencimiento} ({f.estado})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Monto</Label><Input type="number" value={pagoForm.monto} onChange={e => setPagoForm(f => ({ ...f, monto: e.target.value }))} /></div>
              <div><Label>Método</Label>
                <Select value={pagoForm.metodo} onValueChange={v => setPagoForm(f => ({ ...f, metodo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Referencia</Label><Input value={pagoForm.referencia} onChange={e => setPagoForm(f => ({ ...f, referencia: e.target.value }))} placeholder="Opcional" /></div>
              <Button className="w-full" onClick={handleCreatePago} disabled={createPago.isPending}>Registrar Pago</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={promesaDialog} onOpenChange={setPromesaDialog}>
          <DialogTrigger asChild><Button variant="outline"><Handshake className="mr-2 h-4 w-4" />Promesa de Pago</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Promesa de Pago</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Monto Prometido</Label><Input type="number" value={promesaForm.monto_prometido} onChange={e => setPromesaForm(f => ({ ...f, monto_prometido: e.target.value }))} /></div>
              <div><Label>Fecha Promesa</Label><Input type="date" value={promesaForm.fecha_promesa} onChange={e => setPromesaForm(f => ({ ...f, fecha_promesa: e.target.value }))} /></div>
              <div><Label>Factura (opcional)</Label>
                <Select value={promesaForm.factura_id} onValueChange={v => setPromesaForm(f => ({ ...f, factura_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{pendientesFacturas.map(f => <SelectItem key={f.id} value={f.id}>{formatCurrency(f.monto)} - {f.fecha_vencimiento}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Notas</Label><Textarea value={promesaForm.notas} onChange={e => setPromesaForm(f => ({ ...f, notas: e.target.value }))} placeholder="Opcional" /></div>
              <Button className="w-full" onClick={handleCreatePromesa} disabled={createPromesa.isPending}>Registrar Promesa</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={notaDialog} onOpenChange={setNotaDialog}>
          <DialogTrigger asChild><Button variant="outline"><MessageSquare className="mr-2 h-4 w-4" />Registrar Contacto</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Nota / Contacto</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Tipo</Label>
                <Select value={notaForm.tipo} onValueChange={v => setNotaForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nota">Nota</SelectItem>
                    <SelectItem value="contacto">Contacto realizado</SelectItem>
                    <SelectItem value="recordatorio">Recordatorio enviado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Contenido</Label><Textarea value={notaForm.contenido} onChange={e => setNotaForm(f => ({ ...f, contenido: e.target.value }))} placeholder="Detalles del contacto o nota..." /></div>
              <Button className="w-full" onClick={handleCreateNota} disabled={createNota.isPending}>Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs: Timeline, Facturas, Pagos, Promesas */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline"><CalendarClock className="mr-1.5 h-4 w-4" />Timeline</TabsTrigger>
          <TabsTrigger value="facturas"><FileText className="mr-1.5 h-4 w-4" />Facturas</TabsTrigger>
          <TabsTrigger value="pagos"><DollarSign className="mr-1.5 h-4 w-4" />Pagos</TabsTrigger>
          <TabsTrigger value="promesas"><Handshake className="mr-1.5 h-4 w-4" />Promesas</TabsTrigger>
        </TabsList>

        {/* Timeline */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader><CardTitle className="text-base">Historial Financiero</CardTitle></CardHeader>
            <CardContent>
              {timelineEvents.length > 0 ? (
                <div className="relative space-y-0">
                  {timelineEvents.map((ev, i) => (
                    <div key={ev.id + ev.type} className="flex gap-4 pb-6 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-card">
                          {timelineIcon(ev.type)}
                        </div>
                        {i < timelineEvents.length - 1 && <div className="w-px flex-1 bg-border" />}
                      </div>
                      <div className="flex-1 pb-2">
                        <p className="text-sm font-medium">{ev.title}</p>
                        <p className="text-xs text-muted-foreground">{ev.subtitle}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{format(parseISO(ev.date), 'PPP', { locale: es })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">Sin actividad registrada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Facturas */}
        <TabsContent value="facturas">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Monto</TableHead>
                    <TableHead>Emisión</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead>DPD</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clienteFacturas.map(f => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium tabular-nums">{formatCurrency(f.monto)}</TableCell>
                      <TableCell>{format(parseISO(f.fecha_emision), 'dd/MM/yy')}</TableCell>
                      <TableCell>{format(parseISO(f.fecha_vencimiento), 'dd/MM/yy')}</TableCell>
                      <TableCell>{f.fecha_pago ? format(parseISO(f.fecha_pago), 'dd/MM/yy') : '—'}</TableCell>
                      <TableCell className="tabular-nums">{f.dpd}d</TableCell>
                      <TableCell><Badge className={estadoColor(f.estado)}>{f.estado}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{f.tipo}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {clienteFacturas.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sin facturas</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pagos */}
        <TabsContent value="pagos">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Referencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagos.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{format(parseISO(p.fecha_pago), 'dd/MM/yy')}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatCurrency(Number(p.monto))}</TableCell>
                      <TableCell><Badge variant="outline">{p.metodo}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{p.referencia || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {pagos.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Sin pagos registrados</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Promesas */}
        <TabsContent value="promesas">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha Promesa</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promesas.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{format(parseISO(p.fecha_promesa), 'dd/MM/yy')}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatCurrency(Number(p.monto_prometido))}</TableCell>
                      <TableCell>
                        <Badge className={p.estado === 'cumplida' ? 'bg-risk-good-bg text-risk-good' : p.estado === 'incumplida' ? 'bg-risk-critical-bg text-risk-critical' : 'bg-accent text-accent-foreground'}>
                          {p.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">{p.notas || '—'}</TableCell>
                      <TableCell>
                        {p.estado === 'pendiente' && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { updatePromesa.mutate({ id: p.id, estado: 'cumplida' }); toast.success('Promesa cumplida'); }} title="Marcar cumplida">
                              <CheckCircle className="h-4 w-4 text-risk-good" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { updatePromesa.mutate({ id: p.id, estado: 'incumplida' }); toast.success('Promesa incumplida'); }} title="Marcar incumplida">
                              <AlertTriangle className="h-4 w-4 text-risk-critical" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {promesas.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Sin promesas registradas</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
