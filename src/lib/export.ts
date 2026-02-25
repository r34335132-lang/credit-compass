import { ClienteKPI, AsesorKPI, Factura } from '@/types';
import { formatCurrency } from '@/lib/kpi';

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const bom = '\uFEFF'; // UTF-8 BOM for Excel
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
  const headers = ['Cliente', 'Asesor', 'Riesgo', 'Línea de Crédito', 'Facturado', 'Vencido', 'DPD', 'Uso Línea %', '% Pago a Tiempo'];
  const rows = kpis.map(k => [
    k.cliente.nombre,
    k.cliente.asesor?.nombre || '—',
    k.riesgo,
    formatCurrency(k.cliente.linea_credito),
    formatCurrency(k.totalFacturado),
    formatCurrency(k.montoVencido),
    String(k.dpd),
    String(Math.round(k.usoLinea)),
    String(Math.round(k.porcentajePagoATiempo)),
  ]);
  downloadCSV(`clientes_kpi_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}

export function exportFacturasCSV(facturas: Factura[]) {
  const headers = ['Cliente', 'Monto', 'Fecha Emisión', 'Fecha Vencimiento', 'Fecha Pago', 'Estado'];
  const rows = facturas.map(f => [
    (f.cliente as any)?.nombre || f.cliente_id,
    formatCurrency(f.monto),
    f.fecha_emision,
    f.fecha_vencimiento,
    f.fecha_pago || '—',
    f.estado,
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
