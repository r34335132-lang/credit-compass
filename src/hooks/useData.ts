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
  return useMutation({ mutationFn: (data: { nombre: string; asesor_id: string | null; linea_credito: number }) => api.createCliente(data), onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }) });
}

export function useUpdateCliente() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...data }: { id: string; nombre: string; asesor_id: string | null; linea_credito: number }) => api.updateCliente(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }) });
}

export function useDeleteCliente() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.deleteCliente, onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }) });
}

export function useCreateFactura() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: { cliente_id: string; monto: number; fecha_emision: string; fecha_vencimiento: string; estado: string }) => api.createFactura(data), onSuccess: () => qc.invalidateQueries({ queryKey: ['facturas'] }) });
}

export function useDeleteFactura() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.deleteFactura, onSuccess: () => qc.invalidateQueries({ queryKey: ['facturas'] }) });
}

export function useRegistrarPago() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ facturaId, fechaPago }: { facturaId: string; fechaPago: string }) => api.registrarPago(facturaId, fechaPago), onSuccess: () => qc.invalidateQueries({ queryKey: ['facturas'] }) });
}
