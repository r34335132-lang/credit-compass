import { useParams, Link } from 'react-router-dom';
import { useAsesores, useClientes, useFacturas } from '@/hooks/useData';
import { calcAsesorKPI, getClienteKPIEffective, formatCurrency, formatPercent } from '@/lib/kpi';
import { RiskBadge } from '@/components/RiskBadge';
import { KPICard } from '@/components/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Users, DollarSign, TrendingDown, Clock } from 'lucide-react';

export default function AsesorDetalle() {
  const { id } = useParams<{ id: string }>();
  const { data: asesores = [] } = useAsesores();
  const { data: clientes = [] } = useClientes();
  const { data: facturas = [] } = useFacturas();

  const asesor = asesores.find(a => a.id === id);
  if (!asesor) return <div className="py-12 text-center text-muted-foreground">Asesor no encontrado</div>;

  const kpi = calcAsesorKPI(asesor, clientes, facturas);
  const asesorClientes = clientes.filter(c => c.asesor_id === asesor.id);
  const clienteKPIs = asesorClientes.map(c => getClienteKPIEffective(c, clientes, facturas));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link to="/asesores" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold">{asesor.nombre}</h1>
          <p className="text-muted-foreground">{asesor.email}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Clientes" value={String(kpi.totalClientes)} icon={Users} />
        <KPICard title="Cartera Total" value={formatCurrency(kpi.totalCartera)} icon={DollarSign} />
        <KPICard title="Monto Vencido" value={formatCurrency(kpi.montoVencido)} subtitle={formatPercent(kpi.porcentajeVencido)} icon={TrendingDown} variant="danger" />
        <KPICard title="DPD Promedio" value={`${kpi.promedioDPD} días`} subtitle={`${kpi.clientesEnRiesgo} en riesgo`} icon={Clock} variant={kpi.clientesEnRiesgo > 0 ? 'warning' : 'good'} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Clientes del Asesor</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Riesgo</TableHead>
                <TableHead className="text-right">Facturado</TableHead>
                <TableHead className="text-right">Vencido</TableHead>
                <TableHead className="text-right">DPD</TableHead>
                <TableHead className="text-right">Uso Línea</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clienteKPIs.map(k => (
                <TableRow key={k.cliente.id}>
                  <TableCell><Link to={`/clientes/${k.cliente.id}`} className="font-medium text-primary hover:underline">{k.cliente.nombre}</Link></TableCell>
                  <TableCell><RiskBadge risk={k.riesgo} dpd={k.dpd} size="sm" /></TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(k.totalFacturado)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(k.montoVencido)}</TableCell>
                  <TableCell className="text-right tabular-nums">{k.dpd}d</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPercent(k.usoLinea)}</TableCell>
                </TableRow>
              ))}
              {clienteKPIs.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sin clientes asignados</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
