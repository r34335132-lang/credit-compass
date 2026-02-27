import { useMemo } from 'react';
import { useClientes, useAsesores, useFacturas, useAllPromesas } from '@/hooks/useData';
import { getClienteKPIEffective, calcAsesorKPI, calcPromesaKPI, generateAlertas, formatCurrency, formatPercent } from '@/lib/kpi';
import { KPICard } from '@/components/KPICard';
import { RiskBadge } from '@/components/RiskBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DollarSign, AlertTriangle, Users, TrendingDown, Clock, Handshake, Presentation } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { RiskLevel } from '@/types';

const RISK_COLORS: Record<RiskLevel, string> = {
  bueno: 'hsl(152, 70%, 40%)',
  malo: 'hsl(45, 90%, 50%)',
  muy_malo: 'hsl(25, 90%, 52%)',
  pesimo: 'hsl(0, 75%, 55%)',
};

export default function Dashboard() {
  const { data: clientes, isLoading: loadingC } = useClientes();
  const { data: asesores, isLoading: loadingA } = useAsesores();
  const { data: facturas, isLoading: loadingF } = useFacturas();
  const { data: allPromesas = [] } = useAllPromesas();

  const isLoading = loadingC || loadingA || loadingF;

  const kpis = useMemo(() => {
    if (!clientes || !asesores || !facturas) return null;
    
    const clienteKPIs = clientes.map(c => getClienteKPIEffective(c, clientes, facturas));
    const asesorKPIs = asesores.map(a => calcAsesorKPI(a, clientes, facturas));
    const alertas = generateAlertas(clientes, asesores, facturas);
    const promesaKPI = calcPromesaKPI(allPromesas);

    const totalCartera = facturas.reduce((s, f) => s + f.monto, 0);
    const montoVencido = clienteKPIs.reduce((s, k) => s + k.montoVencido, 0);

    // Risk distribution
    const riskDist = { bueno: 0, malo: 0, muy_malo: 0, pesimo: 0 };
    clienteKPIs.forEach(k => riskDist[k.riesgo]++);

    const riskChartData = [
      { name: 'Bueno', value: riskDist.bueno, fill: RISK_COLORS.bueno },
      { name: 'Malo', value: riskDist.malo, fill: RISK_COLORS.malo },
      { name: 'Muy Malo', value: riskDist.muy_malo, fill: RISK_COLORS.muy_malo },
      { name: 'Pésimo', value: riskDist.pesimo, fill: RISK_COLORS.pesimo },
    ].filter(d => d.value > 0);

    // Advisor performance
    const asesorChartData = asesorKPIs.map(a => ({
      name: a.asesor.nombre,
      cartera: a.totalCartera,
      vencido: a.montoVencido,
    }));

    // Top 15 clients by overdue amount
    const top15Deudores = [...clienteKPIs]
      .sort((a, b) => b.montoVencido - a.montoVencido)
      .slice(0, 15)
      .filter(k => k.montoVencido > 0)
      .map(k => ({
        name: k.cliente.nombre.length > 15 ? k.cliente.nombre.substring(0, 15) + '…' : k.cliente.nombre,
        fullName: k.cliente.nombre,
        facturado: k.totalFacturado,
        vencido: k.montoVencido,
        dpd: k.dpd,
        id: k.cliente.id,
      }));

    return {
      clienteKPIs,
      asesorKPIs,
      alertas,
      promesaKPI,
      totalCartera,
      montoVencido,
      riskChartData,
      asesorChartData,
      top15Deudores,
      totalClientes: clientes.length,
      totalFacturas: facturas.length,
      promedioDPD: clienteKPIs.length > 0 ? Math.round(clienteKPIs.reduce((s, k) => s + k.dpd, 0) / clienteKPIs.length) : 0,
    };
  }, [clientes, asesores, facturas, allPromesas]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  if (!kpis) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Resumen de cartera y riesgo crediticio</p>
        </div>
        <Link to="/vista-junta">
          <Button variant="outline"><Presentation className="mr-2 h-4 w-4" />Vista Junta</Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KPICard title="Cartera Total" value={formatCurrency(kpis.totalCartera)} subtitle={`${kpis.totalFacturas} facturas`} icon={DollarSign} />
        <KPICard title="Monto Vencido" value={formatCurrency(kpis.montoVencido)} subtitle={formatPercent(kpis.totalCartera > 0 ? (kpis.montoVencido / kpis.totalCartera) * 100 : 0)} icon={TrendingDown} variant="danger" />
        <KPICard title="Clientes" value={String(kpis.totalClientes)} subtitle={`${kpis.alertas.length} en riesgo`} icon={Users} variant={kpis.alertas.length > 0 ? 'warning' : 'good'} />
        <KPICard title="DPD Promedio" value={`${kpis.promedioDPD} días`} subtitle="Días promedio de atraso" icon={Clock} variant={kpis.promedioDPD > 5 ? 'danger' : kpis.promedioDPD > 2 ? 'warning' : 'good'} />
        <KPICard title="Promesas" value={`${kpis.promesaKPI.cumplidas}/${kpis.promesaKPI.total}`} subtitle={`${formatPercent(kpis.promesaKPI.porcentajeCumplimiento)} cumplimiento`} icon={Handshake} variant={kpis.promesaKPI.porcentajeCumplimiento < 50 ? 'danger' : 'good'} />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Desempeño por Asesor</CardTitle></CardHeader>
          <CardContent>
            {kpis.asesorChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={kpis.asesorChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="cartera" name="Cartera" fill="hsl(210, 100%, 45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="vencido" name="Vencido" fill="hsl(0, 75%, 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-muted-foreground">Sin datos de asesores</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Distribución de Riesgo</CardTitle></CardHeader>
          <CardContent>
            {kpis.riskChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={kpis.riskChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {kpis.riskChartData.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-muted-foreground">Sin datos de clientes</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 15 Deudores Chart */}
      {kpis.top15Deudores.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Top 15 Clientes con Mayor Deuda</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={kpis.top15Deudores} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(name) => {
                  const item = kpis.top15Deudores.find(d => d.name === name);
                  return item ? `${item.fullName} (DPD: ${item.dpd}d)` : name;
                }} />
                <Bar dataKey="facturado" name="Facturado" fill="hsl(210, 100%, 45%)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="vencido" name="Vencido" fill="hsl(0, 75%, 55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {kpis.alertas.length > 0 && (
        <Card className="border-risk-critical/30">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-risk-critical" />
            <CardTitle className="text-base">Alertas de Riesgo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {kpis.alertas.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <RiskBadge risk={a.riesgo} dpd={a.dpd} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{a.clienteNombre}</p>
                    <p className="text-xs text-muted-foreground">{a.mensaje}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Asesor: {a.asesorNombre}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top clients table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Clientes - Resumen</CardTitle></CardHeader>
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
              {kpis.clienteKPIs.length > 0 ? kpis.clienteKPIs.map((k) => (
                <TableRow key={k.cliente.id}>
                  <TableCell>
                    <Link to={`/clientes/${k.cliente.id}`} className="font-medium text-primary hover:underline">{k.cliente.nombre}</Link>
                  </TableCell>
                  <TableCell><RiskBadge risk={k.riesgo} dpd={k.dpd} size="sm" /></TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(k.totalFacturado)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(k.montoVencido)}</TableCell>
                  <TableCell className="text-right tabular-nums">{k.dpd} días</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPercent(k.usoLinea)}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No hay clientes registrados. <Link to="/clientes" className="text-primary hover:underline">Agregar clientes</Link>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
