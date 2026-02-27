import { supabase } from '@/integrations/supabase/client';
import { Asesor, Cliente, Factura, Pago, NotaCobranza, PromesaPago } from '@/types';

// Asesores
export async function fetchAsesores(): Promise<Asesor[]> {
  const { data, error } = await supabase.from('asesores').select('*').order('nombre');
  if (error) throw error;
  return data as Asesor[];
}

export async function createAsesor(asesor: { nombre: string; email: string }) {
  const { data, error } = await supabase.from('asesores').insert(asesor).select().single();
  if (error) throw error;
  return data;
}

export async function updateAsesor(id: string, asesor: { nombre: string; email: string }) {
  const { data, error } = await supabase.from('asesores').update(asesor).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteAsesor(id: string) {
  const { error } = await supabase.from('asesores').delete().eq('id', id);
  if (error) throw error;
}

// Clientes
export async function fetchClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase.from('clientes').select('*, asesor:asesores(*)').order('nombre');
  if (error) throw error;
  return data as unknown as Cliente[];
}

export async function createCliente(cliente: { nombre: string; asesor_id: string | null; linea_credito: number; parent_cliente_id?: string | null; es_grupo?: boolean }) {
  const { data, error } = await supabase.from('clientes').insert(cliente).select().single();
  if (error) throw error;
  return data;
}

export async function updateCliente(id: string, cliente: { nombre?: string; asesor_id?: string | null; linea_credito?: number; parent_cliente_id?: string | null; es_grupo?: boolean }) {
  const { data, error } = await supabase.from('clientes').update(cliente).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCliente(id: string) {
  const { error } = await supabase.from('clientes').delete().eq('id', id);
  if (error) throw error;
}

// Facturas
export async function fetchFacturas(): Promise<Factura[]> {
  const { data, error } = await supabase.from('facturas').select('*, cliente:clientes(*, asesor:asesores(*))').order('fecha_emision', { ascending: false });
  if (error) throw error;
  return data as unknown as Factura[];
}

export async function createFactura(factura: { cliente_id: string; monto: number; fecha_emision: string; fecha_vencimiento: string; estado: string; numero_factura?: string }) {
  const { data, error } = await supabase.from('facturas').insert(factura).select().single();
  if (error) throw error;
  return data;
}

export async function updateFactura(id: string, factura: Partial<Factura>) {
  const { data, error } = await supabase.from('facturas').update(factura).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteFactura(id: string) {
  const { error } = await supabase.from('facturas').delete().eq('id', id);
  if (error) throw error;
}

export async function registrarPago(facturaId: string, fechaPago: string) {
  const { data, error } = await supabase
    .from('facturas')
    .update({ fecha_pago: fechaPago, estado: 'pagada' })
    .eq('id', facturaId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Pagos
export async function fetchPagos(facturaId?: string): Promise<Pago[]> {
  let query = supabase.from('pagos').select('*').order('fecha_pago', { ascending: false });
  if (facturaId) query = query.eq('factura_id', facturaId);
  const { data, error } = await query;
  if (error) throw error;
  return data as Pago[];
}

export async function fetchAllPagos(): Promise<Pago[]> {
  const { data, error } = await supabase.from('pagos').select('*').order('fecha_pago', { ascending: false });
  if (error) throw error;
  return data as Pago[];
}

export async function fetchPagosByCliente(clienteId: string): Promise<Pago[]> {
  const { data: facturas, error: fError } = await supabase.from('facturas').select('id').eq('cliente_id', clienteId);
  if (fError) throw fError;
  if (!facturas || facturas.length === 0) return [];
  const ids = facturas.map(f => f.id);
  const { data, error } = await supabase.from('pagos').select('*').in('factura_id', ids).order('fecha_pago', { ascending: false });
  if (error) throw error;
  return data as Pago[];
}

export async function createPago(pago: { factura_id: string; monto: number; fecha_pago: string; referencia?: string; registrado_por?: string }) {
  const { data, error } = await supabase.from('pagos').insert({ ...pago, metodo: 'transferencia' }).select().single();
  if (error) throw error;
  return data;
}

// Notas de cobranza
export async function fetchNotasCobranza(clienteId: string): Promise<NotaCobranza[]> {
  const { data, error } = await supabase.from('notas_cobranza').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as NotaCobranza[];
}

export async function createNotaCobranza(nota: { cliente_id: string; tipo: string; contenido: string; registrado_por?: string }) {
  const { data, error } = await supabase.from('notas_cobranza').insert(nota).select().single();
  if (error) throw error;
  return data;
}

// Promesas de pago
export async function fetchPromesasPago(clienteId: string): Promise<PromesaPago[]> {
  const { data, error } = await supabase.from('promesas_pago').select('*').eq('cliente_id', clienteId).order('fecha_promesa', { ascending: false });
  if (error) throw error;
  return data as PromesaPago[];
}

export async function fetchAllPromesas(): Promise<PromesaPago[]> {
  const { data, error } = await supabase.from('promesas_pago').select('*').order('fecha_promesa', { ascending: false });
  if (error) throw error;
  return data as PromesaPago[];
}

export async function createPromesaPago(promesa: { cliente_id: string; factura_id?: string; monto_prometido: number; fecha_promesa: string; notas?: string; registrado_por?: string }) {
  const { data, error } = await supabase.from('promesas_pago').insert(promesa).select().single();
  if (error) throw error;
  return data;
}

export async function updatePromesaPago(id: string, data: { estado: string }) {
  const { error } = await supabase.from('promesas_pago').update(data).eq('id', id);
  if (error) throw error;
}
