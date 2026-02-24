import { useClientes, useAsesores, useFacturas } from '@/hooks/useData';
import { generateAlertas } from '@/lib/kpi';
import { RiskBadge } from '@/components/RiskBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Alertas() {
  const { data: clientes = [] } = useClientes();
  const { data: asesores = [] } = useAsesores();
  const { data: facturas = [] } = useFacturas();

  const alertas = generateAlertas(clientes, asesores, facturas);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Alertas de Riesgo</h1>
        <p className="text-muted-foreground">{alertas.length} clientes con riesgo elevado</p>
      </div>

      {alertas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="rounded-full bg-risk-good-bg p-4">
              <AlertTriangle className="h-8 w-8 text-risk-good" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium">Sin alertas activas</p>
              <p className="text-muted-foreground">Todos los clientes están dentro de los parámetros normales.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alertas.map(a => (
            <Card key={a.id} className="border-l-4" style={{ borderLeftColor: `hsl(var(--risk-${a.riesgo === 'pesimo' ? 'critical' : 'very-bad'}))` }}>
              <CardContent className="flex items-start gap-4 p-5">
                <div className="rounded-lg bg-risk-critical-bg p-2.5">
                  <AlertTriangle className="h-5 w-5 text-risk-critical" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-3">
                    <Link to={`/clientes/${a.id}`} className="font-semibold text-primary hover:underline">{a.clienteNombre}</Link>
                    <RiskBadge risk={a.riesgo} size="sm" />
                  </div>
                  <p className="text-sm text-muted-foreground">{a.mensaje}</p>
                  <p className="text-xs text-muted-foreground">Asesor: <span className="font-medium">{a.asesorNombre}</span> · DPD: <span className="font-medium">{a.dpd} días</span></p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
