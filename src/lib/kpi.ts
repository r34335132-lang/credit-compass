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

export function calcClienteKPI(cliente: Cliente, facturas: Factura[], allPagos?: { factura_id: string; monto: number }[], _usePrefiltered?: boolean): ClienteKPI {
  // When called from getClienteOrGrupoKPI with consolidated invoices, _usePrefiltered=true
  // skips the client filter so all passed invoices are used.
  const clienteFacturas = _usePrefiltered ? facturas : facturas.filter(f => f.cliente_id === cliente.id);
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
 * Auto-detects whether a client is a grupo originador and returns consolidated
 * KPIs (summing sub-client invoices) or individual KPIs accordingly.
 * This is the primary helper all views should use instead of calling calcClienteKPI directly.
 */
export function getClienteOrGrupoKPI(
  cliente: Cliente,
  allClientes: Cliente[],
  facturas: Factura[],
  allPagos?: { factura_id: string; monto: number }[]
): ClienteKPI {
  const isGrupo = cliente.es_grupo || cliente.tipo_cliente === 'grupo_originador';
  const subClientes = allClientes.filter(c => c.parent_cliente_id === cliente.id);

  if (isGrupo && subClientes.length > 0) {
    // Consolidate invoices from the group + all sub-clients
    const allGroupIds = new Set([cliente.id, ...subClientes.map(c => c.id)]);
    const groupFacturas = facturas.filter(f => allGroupIds.has(f.cliente_id));

    // Calculate KPI using the consolidated invoices, skip re-filtering by cliente.id
    const kpi = calcClienteKPI(cliente, groupFacturas, allPagos, true);

    // Consolidated credit line from group + sub-clients
    const totalLinea = [cliente, ...subClientes].reduce((s, c) => s + c.linea_credito, 0);
    const usoLinea = totalLinea > 0 ? (kpi.saldoPendiente / totalLinea) * 100 : 0;

    return { ...kpi, usoLinea };
  }

  return calcClienteKPI(cliente, facturas, allPagos);
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
  
  // For behavioral KPIs and risk, use consolidated KPIs to avoid groups showing $0
  // Filter out sub-clients whose parent group is also in the asesor's list to avoid double-counting
  const groupIds = new Set(asesorClientes.filter(c => c.es_grupo || c.tipo_cliente === 'grupo_originador').map(c => c.id));
  const topLevelClientes = asesorClientes.filter(c => !c.parent_cliente_id || !groupIds.has(c.parent_cliente_id));
  
  // Behavioral KPIs: only activo + riesgo, using consolidated KPIs for groups
  const behavioralClients = topLevelClientes.filter(c => c.estado_credito !== 'buro');
  const behavioralKPIs = behavioralClients.map(c => getClienteOrGrupoKPI(c, clientes, facturas));
  const promedioDPD = behavioralKPIs.length > 0 
    ? Math.round(behavioralKPIs.reduce((s, k) => s + k.dpd, 0) / behavioralKPIs.length) 
    : 0;
  
  const allKPIs = topLevelClientes.map(c => getClienteOrGrupoKPI(c, clientes, facturas));
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
    // Skip grupo_originador (no invoices) and buro clients from behavioral alerts
    if (cliente.tipo_cliente === 'grupo_originador') return;
    if (cliente.estado_credito === 'buro') return;
    
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
