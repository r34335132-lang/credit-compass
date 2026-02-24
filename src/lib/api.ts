import { supabase } from '@/integrations/supabase/client';
import { Asesor, Cliente, Factura } from '@/types';

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

export async function createCliente(cliente: { nombre: string; asesor_id: string | null; linea_credito: number }) {
  const { data, error } = await supabase.from('clientes').insert(cliente).select().single();
  if (error) throw error;
  return data;
}

export async function updateCliente(id: string, cliente: { nombre: string; asesor_id: string | null; linea_credito: number }) {
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

export async function createFactura(factura: { cliente_id: string; monto: number; fecha_emision: string; fecha_vencimiento: string; estado: string }) {
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
