import { useMemo } from 'react';
import { useClientes, useAsesores, useFacturas, useAllPromesas, useAllPagos } from '@/hooks/useData';
import { calcClienteKPI, calcPromesaKPI, generateAlertas, formatCurrency, formatPercent } from '@/lib/kpi';
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
  const { data: allPagos = [] } = useAllPagos();

  const data = useMemo(() => {
    if (!clientes.length || !facturas.length) {
      return { 
        totalCartera: 0, 
        montoVencido: 0, 
        promedioDPD: 0, 
        alertas: [], 
        promesaKPI: { cumplidas: 0, total: 0, porcentajeCumplimiento: 0 }, 
        top15: [], 
        totalClientes: clientes.length 
      };
    }

    const clienteKPIs = clientes.map(c => calcClienteKPI(c, facturas, allPagos));
    const alertas = generateAlertas(clientes, asesores, facturas, allPagos);
    const promesaKPI = calcPromesaKPI(allPromesas);
    
    const totalFacturado = facturas.reduce((s, f) => s + f.monto, 0);
    const totalPagado = allPagos.reduce((s, p) => s + Number(p.monto), 0);
    const totalCartera = Math.max(0, totalFacturado - totalPagado);

    const montoVencido = clienteKPIs.reduce((s, k) => s + k.montoVencido, 0);
    const promedioDPD = Math.round(clienteKPIs.reduce((s, k) => s + k.dpd, 0) / clienteKPIs.length);

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
  }, [clientes, asesores, facturas, allPromesas, allPagos]);

  return (
    <div className="min-h-screen bg-background p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Vista Ejecutiva</h1>
            <p className="text-lg text-muted-foreground">Resumen para junta · {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* Ajuste de Grid y tipografía para evitar desbordes */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-2 overflow-hidden">
          <CardContent className="pt-6 text-center px-2">
            <DollarSign className="mx-auto h-6 w-6 text-primary mb-2" />
            <p className="text-2xl xl:text-3xl font-bold tabular-nums truncate">
              {formatCurrency(data.totalCartera)}
            </p>
            <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wider">Cartera Total</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-risk-critical/30 overflow-hidden">
          <CardContent className="pt-6 text-center px-2">
            <TrendingDown className="mx-auto h-6 w-6 text-risk-critical mb-2" />
            <p className="text-2xl xl:text-3xl font-bold tabular-nums text-risk-critical truncate">
              {formatCurrency(data.montoVencido)}
            </p>
            <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wider">Monto Vencido</p>
            <p className="text-[10px] text-muted-foreground">
              {formatPercent(data.totalCartera > 0 ? (data.montoVencido / data.totalCartera) * 100 : 0)} del total
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 overflow-hidden">
          <CardContent className="pt-6 text-center px-2">
            <Clock className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-2xl xl:text-3xl font-bold tabular-nums truncate">{data.promedioDPD}d</p>
            <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wider">DPD Promedio</p>
          </CardContent>
        </Card>

        <Card className="border-2 overflow-hidden">
          <CardContent className="pt-6 text-center px-2">
            <AlertTriangle className="mx-auto h-6 w-6 text-risk-bad mb-2" />
            <p className="text-2xl xl:text-3xl font-bold tabular-nums truncate">{data.alertas.length}</p>
            <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wider">Alertas</p>
            <p className="text-[10px] text-muted-foreground">de {data.totalClientes} clientes</p>
          </CardContent>
        </Card>

        <Card className="border-2 overflow-hidden">
          <CardContent className="pt-6 text-center px-2">
            <Handshake className="mx-auto h-6 w-6 text-primary mb-2" />
            <p className="text-2xl xl:text-3xl font-bold tabular-nums truncate">
              {formatPercent(data.promesaKPI.porcentajeCumplimiento)}
            </p>
            <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wider">Cumplimiento</p>
            <p className="text-[10px] text-muted-foreground">{data.promesaKPI.cumplidas}/{data.promesaKPI.total} promesas</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfica */}
      {data.top15.length > 0 && (
        <Card className="border-2">
          <CardHeader><CardTitle>Top 15 Clientes con Mayor Deuda Vencida</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={data.top15} layout="vertical" margin={{ left: 30, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={150} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="facturado" name="Facturado" fill="hsl(210, 100%, 45%)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="vencido" name="Vencido" fill="hsl(0, 75%, 55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
