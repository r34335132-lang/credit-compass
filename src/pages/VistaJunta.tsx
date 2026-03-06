import { useMemo } from 'react';
import { useClientes, useAsesores, useFacturas, useAllPromesas, useAllPagos } from '@/hooks/useData';
// Cambiamos calcClienteKPI por getClienteKPIEffective
import { getClienteKPIEffective, calcPromesaKPI, generateAlertas, formatCurrency, formatPercent } from '@/lib/kpi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingDown, AlertTriangle, Clock, Handshake, ArrowLeft } from 'lucide-react';
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

    // USAR getClienteKPIEffective para que considere grupos igual que el Dashboard
    const clienteKPIs = clientes.map(c => getClienteKPIEffective(c, clientes, facturas, allPagos));
    const alertas = generateAlertas(clientes, asesores, facturas, allPagos);
    const promesaKPI = calcPromesaKPI(allPromesas);
    
    const totalFacturado = facturas.reduce((s, f) => s + f.monto, 0);
    const totalPagado = allPagos.reduce((s, p) => s + Number(p.monto), 0);
    const totalCartera = Math.max(0, totalFacturado - totalPagado);

    // Ahora este montoVencido coincidirá con el del Dashboard
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
      {/* ... (resto del código del componente igual que el anterior enviado) ... */}
    </div>
  );
}
