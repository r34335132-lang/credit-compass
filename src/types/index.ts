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
  ciclo_facturacion: string;
  dia_corte: number;
  dia_pago: number;
  limite_dias_atraso_alerta: number;
  estado_credito: string;
  parent_cliente_id: string | null;
  es_grupo: boolean;
  tipo_cliente?: string;
  asesor?: Asesor;
}

export interface Factura {
  id: string;
  cliente_id: string;
  monto: number;
  fecha_emision: string;
  fecha_vencimiento: string;
  fecha_pago: string | null;
  estado: 'pagada' | 'vencida' | 'pendiente' | 'parcial';
  created_at: string;
  numero_factura: string | null;
  periodo_facturacion: string | null;
  tipo: string;
  dpd: number;
  dias_gracia: number;
  notas_cobranza: string | null;
  cliente?: Cliente;
}

export interface Pago {
  id: string;
  factura_id: string;
  monto: number;
  fecha_pago: string;
  metodo: string;
  referencia: string | null;
  registrado_por: string | null;
  created_at: string;
}

export interface NotaCobranza {
  id: string;
  cliente_id: string;
  tipo: string;
  contenido: string;
  registrado_por: string | null;
  created_at: string;
}

export interface PromesaPago {
  id: string;
  cliente_id: string;
  factura_id: string | null;
  monto_prometido: number;
  fecha_promesa: string;
  estado: string;
  notas: string | null;
  registrado_por: string | null;
  created_at: string;
}

export interface ClienteKPI {
  cliente: Cliente;
  totalFacturado: number;
  montoVencido: number;
  saldoPendiente: number;
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

export interface PromesaKPI {
  total: number;
  cumplidas: number;
  incumplidas: number;
  pendientes: number;
  porcentajeCumplimiento: number;
}

export interface Alerta {
  id: string;
  clienteNombre: string;
  asesorNombre: string;
  mensaje: string;
  riesgo: RiskLevel;
  dpd: number;
}

export interface GrupoKPI {
  grupo: Cliente;
  subClientes: Cliente[];
  totalFacturado: number;
  montoVencido: number;
  promedioDPD: number;
  riesgo: RiskLevel;
  usoLinea: number;
}

export interface HistorialBuro {
  id: string;
  cliente_id: string;
  estado_anterior: string;
  estado_nuevo: string;
  motivo: string | null;
  registrado_por: string | null;
  created_at: string;
}

