import { useParams, Link } from 'react-router-dom';
import { useClientes, useFacturas, useAsesores } from '@/hooks/useData';
import { calcClienteKPI, formatCurrency, formatPercent } from '@/lib/kpi';
import { RiskBadge } from '@/components/RiskBadge';
import { KPICard } from '@/components/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, DollarSign, Clock, TrendingUp, CreditCard } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ClienteDetalle() {
  const { id } = useParams<{ id: string }>();
  const { data: clientes = [] } = useClientes();
  const { data: facturas = [] } = useFacturas();
  const { data: asesores = [] } = useAsesores();

  const cliente = clientes.find(c => c.id === id);
  if (!cliente) return <div className="py-12 text-center text-muted-foreground">Cliente no encontrado</div>;

  const kpi = calcClienteKPI(cliente, facturas);
  const clienteFacturas = facturas.filter(f => f.cliente_id === cliente.id);
  const asesor = asesores.find(a => a.id === cliente.asesor_id);

  const estadoColor = (estado: string) => {
    switch (estado) {
      case 'pagada': return 'bg-risk-good-bg text-risk-good';
      case 'vencida': return 'bg-risk-critical-bg text-risk-critical';
      default: return 'bg-accent text-accent-foreground';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link to="/clientes" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{cliente.nombre}</h1>
            <RiskBadge risk={kpi.riesgo} size="lg" />
          </div>
          <p className="text-muted-foreground">Asesor: {asesor?.nombre || 'Sin asignar'} · Registrado: {format(parseISO(cliente.fecha_registro), 'PP', { locale: es })}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Total Facturado" value={formatCurrency(kpi.totalFacturado)} icon={DollarSign} />
        <KPICard title="Monto Vencido" value={formatCurrency(kpi.montoVencido)} icon={TrendingUp} variant="danger" />
        <KPICard title="DPD Promedio" value={`${kpi.dpd} días`} icon={Clock} variant={kpi.dpd > 5 ? 'danger' : kpi.dpd > 2 ? 'warning' : 'good'} />
        <KPICard title="Uso de Línea" value={formatPercent(kpi.usoLinea)} subtitle={`Línea: ${formatCurrency(cliente.linea_credito)}`} icon={CreditCard} variant={kpi.usoLinea > 90 ? 'danger' : kpi.usoLinea > 70 ? 'warning' : 'default'} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Pagos a Tiempo</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold tabular-nums">{formatPercent(kpi.porcentajePagoATiempo)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Frecuencia Atraso</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold tabular-nums">{formatPercent(kpi.frecuenciaAtraso)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Total Facturas</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold tabular-nums">{clienteFacturas.length}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Historial de Facturas</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Monto</TableHead>
                <TableHead>Emisión</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clienteFacturas.map(f => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium tabular-nums">{formatCurrency(f.monto)}</TableCell>
                  <TableCell>{format(parseISO(f.fecha_emision), 'dd/MM/yy')}</TableCell>
                  <TableCell>{format(parseISO(f.fecha_vencimiento), 'dd/MM/yy')}</TableCell>
                  <TableCell>{f.fecha_pago ? format(parseISO(f.fecha_pago), 'dd/MM/yy') : '—'}</TableCell>
                  <TableCell><Badge className={estadoColor(f.estado)}>{f.estado}</Badge></TableCell>
                </TableRow>
              ))}
              {clienteFacturas.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Sin facturas</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
