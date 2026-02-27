-- ============================================================
-- 002_rls_policies.sql
-- Credit Compass - Row Level Security & Policies
-- Run AFTER 001_schema.sql
-- IDEMPOTENT: safe to re-run (drops before creating)
-- ============================================================

-- Enable RLS on every table
ALTER TABLE public.asesores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_cobranza ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promesas_pago  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles     ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ASESORES - authenticated full CRUD
-- ============================================================
DROP POLICY IF EXISTS "asesores_select" ON public.asesores;
CREATE POLICY "asesores_select" ON public.asesores
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "asesores_insert" ON public.asesores;
CREATE POLICY "asesores_insert" ON public.asesores
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "asesores_update" ON public.asesores;
CREATE POLICY "asesores_update" ON public.asesores
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "asesores_delete" ON public.asesores;
CREATE POLICY "asesores_delete" ON public.asesores
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- CLIENTES - authenticated full CRUD
-- ============================================================
DROP POLICY IF EXISTS "clientes_select" ON public.clientes;
CREATE POLICY "clientes_select" ON public.clientes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "clientes_insert" ON public.clientes;
CREATE POLICY "clientes_insert" ON public.clientes
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "clientes_update" ON public.clientes;
CREATE POLICY "clientes_update" ON public.clientes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "clientes_delete" ON public.clientes;
CREATE POLICY "clientes_delete" ON public.clientes
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- FACTURAS - authenticated full CRUD
-- ============================================================
DROP POLICY IF EXISTS "facturas_select" ON public.facturas;
CREATE POLICY "facturas_select" ON public.facturas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "facturas_insert" ON public.facturas;
CREATE POLICY "facturas_insert" ON public.facturas
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "facturas_update" ON public.facturas;
CREATE POLICY "facturas_update" ON public.facturas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "facturas_delete" ON public.facturas;
CREATE POLICY "facturas_delete" ON public.facturas
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- PAGOS - authenticated full CRUD
-- ============================================================
DROP POLICY IF EXISTS "pagos_select" ON public.pagos;
CREATE POLICY "pagos_select" ON public.pagos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "pagos_insert" ON public.pagos;
CREATE POLICY "pagos_insert" ON public.pagos
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pagos_update" ON public.pagos;
CREATE POLICY "pagos_update" ON public.pagos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pagos_delete" ON public.pagos;
CREATE POLICY "pagos_delete" ON public.pagos
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- NOTAS_COBRANZA - authenticated full CRUD
-- ============================================================
DROP POLICY IF EXISTS "notas_cobranza_select" ON public.notas_cobranza;
CREATE POLICY "notas_cobranza_select" ON public.notas_cobranza
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "notas_cobranza_insert" ON public.notas_cobranza;
CREATE POLICY "notas_cobranza_insert" ON public.notas_cobranza
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notas_cobranza_update" ON public.notas_cobranza;
CREATE POLICY "notas_cobranza_update" ON public.notas_cobranza
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "notas_cobranza_delete" ON public.notas_cobranza;
CREATE POLICY "notas_cobranza_delete" ON public.notas_cobranza
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- PROMESAS_PAGO - authenticated full CRUD
-- ============================================================
DROP POLICY IF EXISTS "promesas_pago_select" ON public.promesas_pago;
CREATE POLICY "promesas_pago_select" ON public.promesas_pago
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "promesas_pago_insert" ON public.promesas_pago;
CREATE POLICY "promesas_pago_insert" ON public.promesas_pago
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "promesas_pago_update" ON public.promesas_pago;
CREATE POLICY "promesas_pago_update" ON public.promesas_pago
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "promesas_pago_delete" ON public.promesas_pago;
CREATE POLICY "promesas_pago_delete" ON public.promesas_pago
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- USER_ROLES - read for authenticated, insert only for admins
-- ============================================================
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
CREATE POLICY "user_roles_insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('admin'::public.app_role, auth.uid()));

-- ============================================================
-- END 002_rls_policies.sql
-- ============================================================
