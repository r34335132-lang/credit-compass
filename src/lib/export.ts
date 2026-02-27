import { ClienteKPI, AsesorKPI, Factura } from '@/types';
import { formatCurrency } from '@/lib/kpi';

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const bom = '\uFEFF';
  const csv = bom + [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportClientesCSV(kpis: ClienteKPI[]) {
  const headers = ['Cliente', 'Asesor', 'Riesgo', 'Estado Crédito', 'Tipo Cliente', 'Línea de Crédito', 'Facturado', 'Vencido', 'Saldo Pendiente', 'DPD', 'Uso Línea %', '% Pago a Tiempo'];
  const rows = kpis.map(k => [
    k.cliente.nombre,
    k.cliente.asesor?.nombre || '—',
    k.riesgo,
    k.cliente.estado_credito,
    k.cliente.tipo_cliente || 'normal',
    formatCurrency(k.cliente.linea_credito),
    formatCurrency(k.totalFacturado),
    formatCurrency(k.montoVencido),
    formatCurrency(k.saldoPendiente),
    String(k.dpd),
    String(Math.round(k.usoLinea)),
    String(Math.round(k.porcentajePagoATiempo)),
  ]);
  downloadCSV(`clientes_kpi_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}

export function exportCarteraCastigadaCSV(kpis: ClienteKPI[]) {
  const buroKPIs = kpis.filter(k => k.cliente.estado_credito === 'buro');
  const headers = ['Cliente', 'Asesor', 'Línea de Crédito', 'Facturado', 'Vencido', 'Saldo Pendiente', 'DPD'];
  const rows = buroKPIs.map(k => [
    k.cliente.nombre,
    k.cliente.asesor?.nombre || '—',
    formatCurrency(k.cliente.linea_credito),
    formatCurrency(k.totalFacturado),
    formatCurrency(k.montoVencido),
    formatCurrency(k.saldoPendiente),
    String(k.dpd),
  ]);
  downloadCSV(`cartera_castigada_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}

export function exportFacturasCSV(facturas: Factura[]) {
  const headers = ['Folio', 'Cliente', 'Monto', 'Fecha Emisión', 'Fecha Vencimiento', 'Fecha Pago', 'Estado', 'DPD'];
  const rows = facturas.map(f => [
    f.numero_factura || '—',
    (f.cliente as any)?.nombre || f.cliente_id,
    formatCurrency(f.monto),
    f.fecha_emision,
    f.fecha_vencimiento,
    f.fecha_pago || '—',
    f.estado,
    String(f.dpd),
  ]);
  downloadCSV(`facturas_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}

export function exportAsesoresCSV(kpis: AsesorKPI[]) {
  const headers = ['Asesor', 'Email', 'Clientes', 'Cartera Total', 'Monto Vencido', '% Vencido', 'DPD Promedio', 'Clientes en Riesgo'];
  const rows = kpis.map(k => [
    k.asesor.nombre,
    k.asesor.email,
    String(k.totalClientes),
    formatCurrency(k.totalCartera),
    formatCurrency(k.montoVencido),
    String(Math.round(k.porcentajeVencido)),
    String(k.promedioDPD),
    String(k.clientesEnRiesgo),
  ]);
  downloadCSV(`asesores_cartera_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}
