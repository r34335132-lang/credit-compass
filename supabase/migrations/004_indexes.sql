-- ============================================================
-- 004_indexes.sql
-- Credit Compass - Performance Indexes & Constraints
-- Run AFTER 003_functions_triggers.sql
-- ============================================================

-- Foreign key indexes (PostgreSQL does NOT auto-create these)
CREATE INDEX IF NOT EXISTS idx_clientes_asesor_id
  ON public.clientes(asesor_id);

CREATE INDEX IF NOT EXISTS idx_clientes_parent_cliente_id
  ON public.clientes(parent_cliente_id);

CREATE INDEX IF NOT EXISTS idx_facturas_cliente_id
  ON public.facturas(cliente_id);

CREATE INDEX IF NOT EXISTS idx_facturas_estado
  ON public.facturas(estado);

CREATE INDEX IF NOT EXISTS idx_facturas_fecha_vencimiento
  ON public.facturas(fecha_vencimiento);

CREATE INDEX IF NOT EXISTS idx_pagos_factura_id
  ON public.pagos(factura_id);

CREATE INDEX IF NOT EXISTS idx_notas_cobranza_cliente_id
  ON public.notas_cobranza(cliente_id);

CREATE INDEX IF NOT EXISTS idx_promesas_pago_cliente_id
  ON public.promesas_pago(cliente_id);

CREATE INDEX IF NOT EXISTS idx_promesas_pago_factura_id
  ON public.promesas_pago(factura_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role
  ON public.user_roles(user_id, role);

-- Partial unique index: numero_factura must be unique when not null
CREATE UNIQUE INDEX IF NOT EXISTS idx_facturas_numero_factura_unique
  ON public.facturas(numero_factura)
  WHERE numero_factura IS NOT NULL;

-- ============================================================
-- END 004_indexes.sql
-- ============================================================
