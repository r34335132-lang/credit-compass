import { Cliente, Factura, Asesor, RiskLevel, ClienteKPI, AsesorKPI, Alerta } from '@/types';
import { differenceInDays, parseISO } from 'date-fns';

export function getRiskLevel(dpd: number): RiskLevel {
  if (dpd <= 1) return 'bueno';
  if (dpd <= 4) return 'malo';
  if (dpd <= 9) return 'muy_malo';
  return 'pesimo';
}

export function getRiskLabel(risk: RiskLevel): string {
  switch (risk) {
    case 'bueno': return 'Bueno';
    case 'malo': return 'Malo';
    case 'muy_malo': return 'Muy Malo';
    case 'pesimo': return 'Pésimo';
  }
}

export function getRiskColor(risk: RiskLevel): string {
  switch (risk) {
    case 'bueno': return 'risk-good';
    case 'malo': return 'risk-bad';
    case 'muy_malo': return 'risk-very-bad';
    case 'pesimo': return 'risk-critical';
  }
}

export function calcClienteKPI(cliente: Cliente, facturas: Factura[]): ClienteKPI {
  const clienteFacturas = facturas.filter(f => f.cliente_id === cliente.id);
  const totalFacturado = clienteFacturas.reduce((s, f) => s + f.monto, 0);
  const vencidas = clienteFacturas.filter(f => f.estado === 'vencida');
  const montoVencido = vencidas.reduce((s, f) => s + f.monto, 0);
  
  const pagadas = clienteFacturas.filter(f => f.estado === 'pagada' && f.fecha_pago);
  const pagadasATiempo = pagadas.filter(f => {
    const venc = parseISO(f.fecha_vencimiento);
    const pago = parseISO(f.fecha_pago!);
    return differenceInDays(pago, venc) <= 0;
  });
  
  const porcentajePagoATiempo = pagadas.length > 0 
    ? (pagadasATiempo.length / pagadas.length) * 100 
    : 100;

  // DPD: average days past due for all non-timely invoices
  const today = new Date();
  const atrasadas = clienteFacturas.filter(f => {
    if (f.estado === 'pagada' && f.fecha_pago) {
      return differenceInDays(parseISO(f.fecha_pago), parseISO(f.fecha_vencimiento)) > 0;
    }
    if (f.estado === 'vencida') {
      return true;
    }
    return false;
  });

  let dpd = 0;
  if (atrasadas.length > 0) {
    const totalDays = atrasadas.reduce((s, f) => {
      if (f.estado === 'pagada' && f.fecha_pago) {
        return s + differenceInDays(parseISO(f.fecha_pago), parseISO(f.fecha_vencimiento));
      }
      return s + differenceInDays(today, parseISO(f.fecha_vencimiento));
    }, 0);
    dpd = Math.round(totalDays / atrasadas.length);
  }

  const frecuenciaAtraso = clienteFacturas.length > 0 
    ? (vencidas.length / clienteFacturas.length) * 100 
    : 0;

  const usoLinea = cliente.linea_credito > 0 
    ? (totalFacturado / cliente.linea_credito) * 100 
    : 0;

  return {
    cliente,
    totalFacturado,
    montoVencido,
    porcentajePagoATiempo,
    dpd,
    frecuenciaAtraso,
    riesgo: getRiskLevel(dpd),
    usoLinea,
  };
}

export function calcAsesorKPI(asesor: Asesor, clientes: Cliente[], facturas: Factura[]): AsesorKPI {
  const asesorClientes = clientes.filter(c => c.asesor_id === asesor.id);
  const clienteIds = new Set(asesorClientes.map(c => c.id));
  const asesorFacturas = facturas.filter(f => clienteIds.has(f.cliente_id));
  
  const totalCartera = asesorFacturas.reduce((s, f) => s + f.monto, 0);
  const montoVencido = asesorFacturas.filter(f => f.estado === 'vencida').reduce((s, f) => s + f.monto, 0);
  
  const clienteKPIs = asesorClientes.map(c => calcClienteKPI(c, facturas));
  const promedioDPD = clienteKPIs.length > 0 
    ? Math.round(clienteKPIs.reduce((s, k) => s + k.dpd, 0) / clienteKPIs.length) 
    : 0;
  
  const clientesEnRiesgo = clienteKPIs.filter(k => k.riesgo === 'muy_malo' || k.riesgo === 'pesimo').length;

  return {
    asesor,
    totalCartera,
    montoVencido,
    porcentajeVencido: totalCartera > 0 ? (montoVencido / totalCartera) * 100 : 0,
    promedioDPD,
    clientesEnRiesgo,
    totalClientes: asesorClientes.length,
  };
}

export function generateAlertas(clientes: Cliente[], asesores: Asesor[], facturas: Factura[]): Alerta[] {
  const alertas: Alerta[] = [];
  
  clientes.forEach(cliente => {
    const kpi = calcClienteKPI(cliente, facturas);
    if (kpi.riesgo === 'muy_malo' || kpi.riesgo === 'pesimo') {
      const asesor = asesores.find(a => a.id === cliente.asesor_id);
      alertas.push({
        id: cliente.id,
        clienteNombre: cliente.nombre,
        asesorNombre: asesor?.nombre || 'Sin asesor',
        mensaje: `Este cliente presenta atraso recurrente (DPD: ${kpi.dpd} días). Revisar gestión de cobranza.`,
        riesgo: kpi.riesgo,
        dpd: kpi.dpd,
      });
    }
  });
  
  return alertas.sort((a, b) => b.dpd - a.dpd);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
