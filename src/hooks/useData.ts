import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';

export function useAsesores() {
  return useQuery({ queryKey: ['asesores'], queryFn: api.fetchAsesores });
}

export function useClientes() {
  return useQuery({ queryKey: ['clientes'], queryFn: api.fetchClientes });
}

export function useFacturas() {
  return useQuery({ queryKey: ['facturas'], queryFn: api.fetchFacturas });
}

export function useAllPagos() {
  return useQuery({ queryKey: ['pagos', 'all'], queryFn: api.fetchAllPagos });
}

export function useAllPromesas() {
  return useQuery({ queryKey: ['promesas_pago', 'all'], queryFn: api.fetchAllPromesas });
}

export function useCreateAsesor() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: { nombre: string; email: string }) => api.createAsesor(data), onSuccess: () => qc.invalidateQueries({ queryKey: ['asesores'] }) });
}

export function useUpdateAsesor() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...data }: { id: string; nombre: string; email: string }) => api.updateAsesor(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['asesores'] }) });
}

export function useDeleteAsesor() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.deleteAsesor, onSuccess: () => qc.invalidateQueries({ queryKey: ['asesores'] }) });
}

export function useCreateCliente() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: { nombre: string; asesor_id: string | null; linea_credito: number; parent_cliente_id?: string | null; es_grupo?: boolean }) => api.createCliente(data), onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }) });
}

export function useUpdateCliente() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...data }: { id: string; nombre?: string; asesor_id?: string | null; linea_credito?: number; parent_cliente_id?: string | null; es_grupo?: boolean }) => api.updateCliente(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }) });
}

export function useDeleteCliente() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.deleteCliente, onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }) });
}

export function useCreateFactura() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: { cliente_id: string; monto: number; fecha_emision: string; fecha_vencimiento: string; estado: string; numero_factura?: string }) => api.createFactura(data), onSuccess: () => qc.invalidateQueries({ queryKey: ['facturas'] }) });
}

export function useDeleteFactura() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.deleteFactura, onSuccess: () => qc.invalidateQueries({ queryKey: ['facturas'] }) });
}

export function useRegistrarPago() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ facturaId, fechaPago }: { facturaId: string; fechaPago: string }) => api.registrarPago(facturaId, fechaPago), onSuccess: () => qc.invalidateQueries({ queryKey: ['facturas'] }) });
}

// Pagos
export function usePagosByCliente(clienteId: string) {
  return useQuery({ queryKey: ['pagos', clienteId], queryFn: () => api.fetchPagosByCliente(clienteId), enabled: !!clienteId });
}

export function useCreatePago() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { factura_id: string; monto: number; fecha_pago: string; referencia?: string; registrado_por?: string }) => api.createPago(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pagos'] });
      qc.invalidateQueries({ queryKey: ['facturas'] });
    },
  });
}

// Notas de cobranza
export function useNotasCobranza(clienteId: string) {
  return useQuery({ queryKey: ['notas_cobranza', clienteId], queryFn: () => api.fetchNotasCobranza(clienteId), enabled: !!clienteId });
}

export function useCreateNotaCobranza() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { cliente_id: string; tipo: string; contenido: string; registrado_por?: string }) => api.createNotaCobranza(data),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['notas_cobranza', vars.cliente_id] }),
  });
}

// Promesas de pago
export function usePromesasPago(clienteId: string) {
  return useQuery({ queryKey: ['promesas_pago', clienteId], queryFn: () => api.fetchPromesasPago(clienteId), enabled: !!clienteId });
}

export function useCreatePromesaPago() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { cliente_id: string; factura_id?: string; monto_prometido: number; fecha_promesa: string; notas?: string; registrado_por?: string }) => api.createPromesaPago(data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['promesas_pago', vars.cliente_id] });
      qc.invalidateQueries({ queryKey: ['promesas_pago', 'all'] });
    },
  });
}

export function useUpdatePromesaPago() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; estado: string }) => api.updatePromesaPago(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promesas_pago'] });
    },
  });
}
