import { Cliente, Factura, Asesor, RiskLevel, ClienteKPI, AsesorKPI, Alerta, PromesaPago, PromesaKPI, GrupoKPI } from '@/types';
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

export function calcClienteKPI(cliente: Cliente, facturas: Factura[], allPagos?: { factura_id: string; monto: number }[], clienteIds?: string[]): ClienteKPI {
  const filterIds = clienteIds ?? [cliente.id];
  const clienteFacturas = facturas.filter(f => filterIds.includes(f.cliente_id));
  const totalFacturado = clienteFacturas.reduce((s, f) => s + f.monto, 0);
  
  // Monto vencido: facturas vencidas O parciales que pasaron fecha_vencimiento
  const today = new Date();
  const vencidasOParciales = clienteFacturas.filter(f => 
    f.estado === 'vencida' || 
    (f.estado === 'parcial' && differenceInDays(today, parseISO(f.fecha_vencimiento)) > 0) ||
    (f.estado === 'pendiente' && differenceInDays(today, parseISO(f.fecha_vencimiento)) > 0)
  );
  const montoVencido = vencidasOParciales.reduce((s, f) => {
    if (allPagos) {
      const pagado = allPagos.filter(p => p.factura_id === f.id).reduce((a, p) => a + Number(p.monto), 0);
      return s + Math.max(0, f.monto - pagado);
    }
    return s + f.monto;
  }, 0);

  // Saldo pendiente: todas las facturas no pagadas completamente
  const saldoPendiente = clienteFacturas.filter(f => f.estado !== 'pagada').reduce((s, f) => {
    if (allPagos) {
      const pagado = allPagos.filter(p => p.factura_id === f.id).reduce((a, p) => a + Number(p.monto), 0);
      return s + Math.max(0, f.monto - pagado);
    }
    return s + f.monto;
  }, 0);
  
  const pagadas = clienteFacturas.filter(f => f.estado === 'pagada' && f.fecha_pago);
  const pagadasATiempo = pagadas.filter(f => {
    const venc = parseISO(f.fecha_vencimiento);
    const pago = parseISO(f.fecha_pago!);
    return differenceInDays(pago, venc) <= 0;
  });
  
  const porcentajePagoATiempo = pagadas.length > 0 
    ? (pagadasATiempo.length / pagadas.length) * 100 
    : 100;

  // DPD: average days past due for non-timely invoices
  const atrasadas = clienteFacturas.filter(f => {
    if (f.estado === 'pagada' && f.fecha_pago) {
      return differenceInDays(parseISO(f.fecha_pago), parseISO(f.fecha_vencimiento)) > 0;
    }
    if (f.estado === 'vencida' || (f.estado === 'parcial' && differenceInDays(today, parseISO(f.fecha_vencimiento)) > 0)) {
      return true;
    }
    if (f.estado === 'pendiente' && differenceInDays(today, parseISO(f.fecha_vencimiento)) > 0) {
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
    ? (atrasadas.length / clienteFacturas.length) * 100 
    : 0;

  // Uso de línea: solo facturas NO pagadas (saldo pendiente)
  const usoLinea = cliente.linea_credito > 0
    ? (saldoPendiente / cliente.linea_credito) * 100
    : 0;

  return {
    cliente,
    totalFacturado,
    montoVencido,
    saldoPendiente,
    porcentajePagoATiempo,
    dpd,
    frecuenciaAtraso,
    riesgo: getRiskLevel(dpd),
    usoLinea,
  };
}

/**
 * Returns KPIs for a client. If the client is a grupo_originador (or has sub-clients),
 * it aggregates all sub-client invoices so the grupo shows correct consolidated metrics.
 */
export function getClienteKPIEffective(
  cliente: Cliente,
  clientes: Cliente[],
  facturas: Factura[],
  allPagos?: { factura_id: string; monto: number }[]
): ClienteKPI {
  const subClientes = clientes.filter(c => c.parent_cliente_id === cliente.id);
  const isGroupParent = cliente.es_grupo || cliente.tipo_cliente === 'grupo_originador' || subClientes.length > 0;

  if (!isGroupParent) {
    return calcClienteKPI(cliente, facturas, allPagos);
  }

  // Gather all IDs: the grupo itself + all sub-clients
  const allGroupClients = [cliente, ...subClientes];
  const allGroupIds = allGroupClients.map(c => c.id);

  // Build a virtual cliente with consolidated linea_credito for accurate usoLinea
  const totalLinea = allGroupClients.reduce((s, c) => s + c.linea_credito, 0);
  const virtualCliente: Cliente = { ...cliente, linea_credito: totalLinea };

  return calcClienteKPI(virtualCliente, facturas, allPagos, allGroupIds);
}

export function calcGrupoKPI(grupo: Cliente, clientes: Cliente[], facturas: Factura[], allPagos?: { factura_id: string; monto: number }[]): GrupoKPI {
  const subClientes = clientes.filter(c => c.parent_cliente_id === grupo.id);
  const allGroupClients = [grupo, ...subClientes];
  const allGroupIds = allGroupClients.map(c => c.id);
  const groupFacturas = facturas.filter(f => allGroupIds.includes(f.cliente_id));

  // Monetary KPIs: ALL clients (including buro)
  const totalFacturado = groupFacturas.reduce((s, f) => s + f.monto, 0);
  const today = new Date();
  const montoVencido = groupFacturas.filter(f =>
    f.estado === 'vencida' ||
    (f.estado === 'parcial' && differenceInDays(today, parseISO(f.fecha_vencimiento)) > 0) ||
    (f.estado === 'pendiente' && differenceInDays(today, parseISO(f.fecha_vencimiento)) > 0)
  ).reduce((s, f) => {
    if (allPagos) {
      const pagado = allPagos.filter(p => p.factura_id === f.id).reduce((a, p) => a + Number(p.monto), 0);
      return s + Math.max(0, f.monto - pagado);
    }
    return s + f.monto;
  }, 0);

  // Behavioral KPIs: only activo + riesgo clients
  const behavioralClients = allGroupClients.filter(c => c.estado_credito !== 'buro');
  const behavioralKPIs = behavioralClients.map(c => calcClienteKPI(c, facturas, allPagos));
  const promedioDPD = behavioralKPIs.length > 0
    ? Math.round(behavioralKPIs.reduce((s, k) => s + k.dpd, 0) / behavioralKPIs.length)
    : 0;

  // Uso de linea consolidated
  const totalLinea = allGroupClients.reduce((s, c) => s + c.linea_credito, 0);
  const totalSaldoPendiente = groupFacturas.filter(f => f.estado !== 'pagada').reduce((s, f) => {
    if (allPagos) {
      const pagado = allPagos.filter(p => p.factura_id === f.id).reduce((a, p) => a + Number(p.monto), 0);
      return s + Math.max(0, f.monto - pagado);
    }
    return s + f.monto;
  }, 0);
  const usoLinea = totalLinea > 0 ? (totalSaldoPendiente / totalLinea) * 100 : 0;

  return {
    grupo,
    subClientes,
    totalFacturado,
    montoVencido,
    promedioDPD,
    riesgo: getRiskLevel(promedioDPD),
    usoLinea,
  };
}

export function calcPromesaKPI(promesas: PromesaPago[]): PromesaKPI {
  const total = promesas.length;
  const cumplidas = promesas.filter(p => p.estado === 'cumplida').length;
  const incumplidas = promesas.filter(p => p.estado === 'incumplida').length;
  const pendientes = promesas.filter(p => p.estado === 'pendiente').length;
  const cerradas = cumplidas + incumplidas;
  return {
    total,
    cumplidas,
    incumplidas,
    pendientes,
    porcentajeCumplimiento: cerradas > 0 ? (cumplidas / cerradas) * 100 : 0,
  };
}

export function calcAsesorKPI(asesor: Asesor, clientes: Cliente[], facturas: Factura[]): AsesorKPI {
  const asesorClientes = clientes.filter(c => c.asesor_id === asesor.id);
  const clienteIds = new Set(asesorClientes.map(c => c.id));
  const asesorFacturas = facturas.filter(f => clienteIds.has(f.cliente_id));
  
  // Monetary KPIs: ALL clients including buro
  const totalCartera = asesorFacturas.reduce((s, f) => s + f.monto, 0);
  
  const today = new Date();
  const montoVencido = asesorFacturas.filter(f => 
    f.estado === 'vencida' || 
    (f.estado === 'parcial' && differenceInDays(today, parseISO(f.fecha_vencimiento)) > 0) ||
    (f.estado === 'pendiente' && differenceInDays(today, parseISO(f.fecha_vencimiento)) > 0)
  ).reduce((s, f) => s + f.monto, 0);
  
  // Behavioral KPIs: only activo + riesgo clients, using effective (grupo-aware) KPIs
  const behavioralClients = asesorClientes.filter(c => c.estado_credito !== 'buro');
  const behavioralKPIs = behavioralClients.map(c => getClienteKPIEffective(c, clientes, facturas));
  const promedioDPD = behavioralKPIs.length > 0 
    ? Math.round(behavioralKPIs.reduce((s, k) => s + k.dpd, 0) / behavioralKPIs.length) 
    : 0;
  
  const allKPIs = asesorClientes.map(c => getClienteKPIEffective(c, clientes, facturas));
  const clientesEnRiesgo = allKPIs.filter(k => k.riesgo === 'muy_malo' || k.riesgo === 'pesimo').length;

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
    // Skip buro clients from behavioral alerts
    if (cliente.estado_credito === 'buro') return;
    
    // Use effective KPI so grupo_originadores get consolidated metrics
    const kpi = getClienteKPIEffective(cliente, clientes, facturas);
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
