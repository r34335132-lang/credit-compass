import { useMemo } from 'react';
import { useClientes, useAsesores, useFacturas } from '@/hooks/useData';
import { calcClienteKPI, calcAsesorKPI, generateAlertas, formatCurrency, formatPercent } from '@/lib/kpi';
import { KPICard } from '@/components/KPICard';
import { RiskBadge } from '@/components/RiskBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DollarSign, AlertTriangle, Users, TrendingDown, FileText, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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

  const isLoading = loadingC || loadingA || loadingF;

  const kpis = useMemo(() => {
    if (!clientes || !asesores || !facturas) return null;
    
    const clienteKPIs = clientes.map(c => calcClienteKPI(c, facturas));
    const asesorKPIs = asesores.map(a => calcAsesorKPI(a, clientes, facturas));
    const alertas = generateAlertas(clientes, asesores, facturas);

    const totalCartera = facturas.reduce((s, f) => s + f.monto, 0);
    const montoVencido = facturas.filter(f => f.estado === 'vencida').reduce((s, f) => s + f.monto, 0);
    const montoCorriente = totalCartera - montoVencido;

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

    return {
      clienteKPIs,
      asesorKPIs,
      alertas,
      totalCartera,
      montoVencido,
      montoCorriente,
      riskChartData,
      asesorChartData,
      totalClientes: clientes.length,
      totalFacturas: facturas.length,
      promedioDPD: clienteKPIs.length > 0 ? Math.round(clienteKPIs.reduce((s, k) => s + k.dpd, 0) / clienteKPIs.length) : 0,
    };
  }, [clientes, asesores, facturas]);

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
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Resumen de cartera y riesgo crediticio</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Cartera Total"
          value={formatCurrency(kpis.totalCartera)}
          subtitle={`${kpis.totalFacturas} facturas`}
          icon={DollarSign}
        />
        <KPICard
          title="Monto Vencido"
          value={formatCurrency(kpis.montoVencido)}
          subtitle={formatPercent(kpis.totalCartera > 0 ? (kpis.montoVencido / kpis.totalCartera) * 100 : 0)}
          icon={TrendingDown}
          variant="danger"
        />
        <KPICard
          title="Clientes"
          value={String(kpis.totalClientes)}
          subtitle={`${kpis.alertas.length} en riesgo`}
          icon={Users}
          variant={kpis.alertas.length > 0 ? 'warning' : 'good'}
        />
        <KPICard
          title="DPD Promedio"
          value={`${kpis.promedioDPD} días`}
          subtitle="Días promedio de atraso"
          icon={Clock}
          variant={kpis.promedioDPD > 5 ? 'danger' : kpis.promedioDPD > 2 ? 'warning' : 'good'}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cartera vencida vs corriente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Desempeño por Asesor</CardTitle>
          </CardHeader>
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

        {/* Risk distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución de Riesgo</CardTitle>
          </CardHeader>
          <CardContent>
            {kpis.riskChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={kpis.riskChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {kpis.riskChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
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
        <CardHeader>
          <CardTitle className="text-base">Clientes - Resumen</CardTitle>
        </CardHeader>
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
                    <Link to={`/clientes/${k.cliente.id}`} className="font-medium text-primary hover:underline">
                      {k.cliente.nombre}
                    </Link>
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
