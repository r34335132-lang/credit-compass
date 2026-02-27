import { useMemo } from 'react';
import { useClientes, useAsesores, useFacturas, useAllPromesas } from '@/hooks/useData';
import { getClienteOrGrupoKPI, calcPromesaKPI, generateAlertas, formatCurrency, formatPercent } from '@/lib/kpi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingDown, AlertTriangle, Clock, Handshake, ArrowLeft } from 'lucide-react';
import { RiskBadge } from '@/components/RiskBadge';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function VistaJunta() {
  const { data: clientes = [] } = useClientes();
  const { data: asesores = [] } = useAsesores();
  const { data: facturas = [] } = useFacturas();
  const { data: allPromesas = [] } = useAllPromesas();

  const data = useMemo(() => {
    // Use consolidated KPIs, exclude sub-clients whose parent group is visible
    const groupIds = new Set(clientes.filter(c => c.es_grupo || c.tipo_cliente === 'grupo_originador').map(c => c.id));
    const topLevelClientes = clientes.filter(c => !c.parent_cliente_id || !groupIds.has(c.parent_cliente_id));
    const clienteKPIs = topLevelClientes.map(c => getClienteOrGrupoKPI(c, clientes, facturas));
    const alertas = generateAlertas(clientes, asesores, facturas);
    const promesaKPI = calcPromesaKPI(allPromesas);
    const totalCartera = facturas.reduce((s, f) => s + f.monto, 0);
    const montoVencido = clienteKPIs.reduce((s, k) => s + k.montoVencido, 0);
    const promedioDPD = clienteKPIs.length > 0 ? Math.round(clienteKPIs.reduce((s, k) => s + k.dpd, 0) / clienteKPIs.length) : 0;

    const top15 = [...clienteKPIs]
      .sort((a, b) => b.montoVencido - a.montoVencido)
      .slice(0, 15)
      .filter(k => k.montoVencido > 0)
      .map(k => ({
        name: k.cliente.nombre.length > 18 ? k.cliente.nombre.substring(0, 18) + '…' : k.cliente.nombre,
        fullName: k.cliente.nombre,
        vencido: k.montoVencido,
        facturado: k.totalFacturado,
        dpd: k.dpd,
        riesgo: k.riesgo,
      }));

    return { totalCartera, montoVencido, promedioDPD, alertas, promesaKPI, top15, totalClientes: clientes.length };
  }, [clientes, asesores, facturas, allPromesas]);

  return (
    <div className="min-h-screen bg-background p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Vista Ejecutiva</h1>
            <p className="text-lg text-muted-foreground">Resumen para junta · {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* Big KPIs */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-2">
          <CardContent className="pt-6 text-center">
            <DollarSign className="mx-auto h-8 w-8 text-primary mb-2" />
            <p className="text-4xl font-bold tabular-nums">{formatCurrency(data.totalCartera)}</p>
            <p className="text-sm text-muted-foreground mt-1">Cartera Total</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-risk-critical/30">
          <CardContent className="pt-6 text-center">
            <TrendingDown className="mx-auto h-8 w-8 text-risk-critical mb-2" />
            <p className="text-4xl font-bold tabular-nums text-risk-critical">{formatCurrency(data.montoVencido)}</p>
            <p className="text-sm text-muted-foreground mt-1">Monto Vencido</p>
            <p className="text-xs text-muted-foreground">{formatPercent(data.totalCartera > 0 ? (data.montoVencido / data.totalCartera) * 100 : 0)} de cartera</p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="pt-6 text-center">
            <Clock className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-4xl font-bold tabular-nums">{data.promedioDPD}d</p>
            <p className="text-sm text-muted-foreground mt-1">DPD Promedio</p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-risk-bad mb-2" />
            <p className="text-4xl font-bold tabular-nums">{data.alertas.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Alertas Activas</p>
            <p className="text-xs text-muted-foreground">de {data.totalClientes} clientes</p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="pt-6 text-center">
            <Handshake className="mx-auto h-8 w-8 text-primary mb-2" />
            <p className="text-4xl font-bold tabular-nums">{formatPercent(data.promesaKPI.porcentajeCumplimiento)}</p>
            <p className="text-sm text-muted-foreground mt-1">Cumplimiento Promesas</p>
            <p className="text-xs text-muted-foreground">{data.promesaKPI.cumplidas}/{data.promesaKPI.total}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top 15 Chart */}
      {data.top15.length > 0 && (
        <Card className="border-2">
          <CardHeader><CardTitle>Top 15 Clientes con Mayor Deuda Vencida</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={data.top15} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(name) => {
                  const item = data.top15.find(d => d.name === name);
                  return item ? `${item.fullName} (DPD: ${item.dpd}d)` : name;
                }} />
                <Bar dataKey="facturado" name="Facturado" fill="hsl(210, 100%, 45%)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="vencido" name="Vencido" fill="hsl(0, 75%, 55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Alertas */}
      {data.alertas.length > 0 && (
        <Card className="border-2 border-risk-critical/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-risk-critical" />Clientes Críticos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {data.alertas.slice(0, 9).map(a => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <RiskBadge risk={a.riesgo} dpd={a.dpd} size="sm" />
                  <div>
                    <p className="text-sm font-semibold">{a.clienteNombre}</p>
                    <p className="text-xs text-muted-foreground">DPD: {a.dpd}d · {a.asesorNombre}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
