export type RiskLevel = 'bueno' | 'malo' | 'muy_malo' | 'pesimo';

export interface Asesor {
  id: string;
  nombre: string;
  email: string;
  created_at: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  asesor_id: string | null;
  linea_credito: number;
  fecha_registro: string;
  created_at: string;
  asesor?: Asesor;
}

export interface Factura {
  id: string;
  cliente_id: string;
  monto: number;
  fecha_emision: string;
  fecha_vencimiento: string;
  fecha_pago: string | null;
  estado: 'pagada' | 'vencida' | 'pendiente';
  created_at: string;
  cliente?: Cliente;
}

export interface ClienteKPI {
  cliente: Cliente;
  totalFacturado: number;
  montoVencido: number;
  porcentajePagoATiempo: number;
  dpd: number;
  frecuenciaAtraso: number;
  riesgo: RiskLevel;
  usoLinea: number;
}

export interface AsesorKPI {
  asesor: Asesor;
  totalCartera: number;
  montoVencido: number;
  porcentajeVencido: number;
  promedioDPD: number;
  clientesEnRiesgo: number;
  totalClientes: number;
}

export interface Alerta {
  id: string;
  clienteNombre: string;
  asesorNombre: string;
  mensaje: string;
  riesgo: RiskLevel;
  dpd: number;
}
