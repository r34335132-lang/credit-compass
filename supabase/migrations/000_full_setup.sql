-- ============================================================
-- CREDIT COMPASS - Full Schema Setup (all-in-one)
-- ============================================================
-- Paste this entire file into your NEW Supabase project's
-- SQL Editor (Dashboard > SQL Editor > New Query) and run it.
--
-- This combines 001_schema + 002_rls_policies +
-- 003_functions_triggers + 004_indexes into a single file.
-- ============================================================


-- ************************************************************
-- PART 1: SCHEMA
-- ************************************************************

-- 1. ENUM: app_role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'asesor');
  END IF;
END $$;

-- 2. TABLE: asesores
CREATE TABLE IF NOT EXISTS public.asesores (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text        NOT NULL,
  email       text        NOT NULL,
  user_id     uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 3. TABLE: clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id                        uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                    text    NOT NULL,
  asesor_id                 uuid    REFERENCES public.asesores(id) ON DELETE SET NULL,
  linea_credito             numeric NOT NULL DEFAULT 0,
  fecha_registro            date    NOT NULL DEFAULT CURRENT_DATE,
  parent_cliente_id         uuid    REFERENCES public.clientes(id) ON DELETE SET NULL,
  es_grupo                  boolean NOT NULL DEFAULT false,
  ciclo_facturacion         text    NOT NULL DEFAULT 'mensual',
  dia_corte                 int     NOT NULL DEFAULT 1,
  dia_pago                  int     NOT NULL DEFAULT 15,
  limite_dias_atraso_alerta int     NOT NULL DEFAULT 5,
  estado_credito            text    NOT NULL DEFAULT 'activo',
  created_at                timestamptz NOT NULL DEFAULT now()
);

-- 4. TABLE: facturas
CREATE TABLE IF NOT EXISTS public.facturas (
  id                   uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id           uuid    NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  monto                numeric NOT NULL,
  fecha_emision        date    NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento    date    NOT NULL,
  fecha_pago           date,
  estado               text    NOT NULL DEFAULT 'pendiente',
  numero_factura       text,
  periodo_facturacion  text,
  tipo                 text    NOT NULL DEFAULT 'manual',
  dpd                  int     NOT NULL DEFAULT 0,
  dias_gracia          int     NOT NULL DEFAULT 0,
  notas_cobranza       text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- 5. TABLE: pagos
CREATE TABLE IF NOT EXISTS public.pagos (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id      uuid    NOT NULL REFERENCES public.facturas(id) ON DELETE CASCADE,
  monto           numeric NOT NULL,
  fecha_pago      date    NOT NULL DEFAULT CURRENT_DATE,
  metodo          text    NOT NULL DEFAULT 'transferencia',
  referencia      text,
  registrado_por  uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 6. TABLE: notas_cobranza
CREATE TABLE IF NOT EXISTS public.notas_cobranza (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      uuid    NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo            text    NOT NULL DEFAULT 'nota',
  contenido       text    NOT NULL,
  registrado_por  uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 7. TABLE: promesas_pago
CREATE TABLE IF NOT EXISTS public.promesas_pago (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id       uuid    NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  factura_id       uuid    REFERENCES public.facturas(id) ON DELETE SET NULL,
  monto_prometido  numeric NOT NULL,
  fecha_promesa    date    NOT NULL,
  estado           text    NOT NULL DEFAULT 'pendiente',
  notas            text,
  registrado_por   uuid,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 8. TABLE: user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id      uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid            NOT NULL,
  role    public.app_role NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- 9. FUNCTION: has_role
CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;


-- ************************************************************
-- PART 2: ROW LEVEL SECURITY
-- ************************************************************

ALTER TABLE public.asesores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_cobranza ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promesas_pago  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles     ENABLE ROW LEVEL SECURITY;

-- asesores
CREATE POLICY "asesores_select" ON public.asesores FOR SELECT TO authenticated USING (true);
CREATE POLICY "asesores_insert" ON public.asesores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "asesores_update" ON public.asesores FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "asesores_delete" ON public.asesores FOR DELETE TO authenticated USING (true);

-- clientes
CREATE POLICY "clientes_select" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "clientes_insert" ON public.clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "clientes_update" ON public.clientes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "clientes_delete" ON public.clientes FOR DELETE TO authenticated USING (true);

-- facturas
CREATE POLICY "facturas_select" ON public.facturas FOR SELECT TO authenticated USING (true);
CREATE POLICY "facturas_insert" ON public.facturas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "facturas_update" ON public.facturas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "facturas_delete" ON public.facturas FOR DELETE TO authenticated USING (true);

-- pagos
CREATE POLICY "pagos_select" ON public.pagos FOR SELECT TO authenticated USING (true);
CREATE POLICY "pagos_insert" ON public.pagos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pagos_update" ON public.pagos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pagos_delete" ON public.pagos FOR DELETE TO authenticated USING (true);

-- notas_cobranza
CREATE POLICY "notas_cobranza_select" ON public.notas_cobranza FOR SELECT TO authenticated USING (true);
CREATE POLICY "notas_cobranza_insert" ON public.notas_cobranza FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notas_cobranza_update" ON public.notas_cobranza FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "notas_cobranza_delete" ON public.notas_cobranza FOR DELETE TO authenticated USING (true);

-- promesas_pago
CREATE POLICY "promesas_pago_select" ON public.promesas_pago FOR SELECT TO authenticated USING (true);
CREATE POLICY "promesas_pago_insert" ON public.promesas_pago FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "promesas_pago_update" ON public.promesas_pago FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "promesas_pago_delete" ON public.promesas_pago FOR DELETE TO authenticated USING (true);

-- user_roles
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role('admin'::public.app_role, auth.uid()));


-- ************************************************************
-- PART 3: FUNCTIONS & TRIGGERS
-- ************************************************************

-- Auto-calculate DPD on facturas
CREATE OR REPLACE FUNCTION public.update_factura_dpd()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.estado IN ('pendiente', 'vencida', 'parcial') AND NEW.fecha_pago IS NULL THEN
    NEW.dpd := GREATEST(0, CURRENT_DATE - NEW.fecha_vencimiento);
    IF NEW.dpd > 0 AND NEW.estado = 'pendiente' THEN
      NEW.estado := 'vencida';
    END IF;
  ELSIF NEW.estado = 'pagada' AND NEW.fecha_pago IS NOT NULL THEN
    NEW.dpd := GREATEST(0, NEW.fecha_pago::date - NEW.fecha_vencimiento);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_factura_dpd ON public.facturas;
CREATE TRIGGER trg_update_factura_dpd
  BEFORE INSERT OR UPDATE ON public.facturas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_factura_dpd();

-- Auto-update factura estado after pago insert
CREATE OR REPLACE FUNCTION public.update_factura_after_pago()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_monto_factura numeric;
  v_total_pagado  numeric;
BEGIN
  SELECT monto INTO v_monto_factura
  FROM public.facturas WHERE id = NEW.factura_id;

  SELECT COALESCE(SUM(monto), 0) INTO v_total_pagado
  FROM public.pagos WHERE factura_id = NEW.factura_id;

  IF v_total_pagado >= v_monto_factura THEN
    UPDATE public.facturas
    SET estado = 'pagada', fecha_pago = NEW.fecha_pago
    WHERE id = NEW.factura_id;
  ELSE
    UPDATE public.facturas
    SET estado = 'parcial'
    WHERE id = NEW.factura_id AND estado != 'pagada';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_factura_after_pago ON public.pagos;
CREATE TRIGGER trg_update_factura_after_pago
  AFTER INSERT ON public.pagos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_factura_after_pago();

-- Check expired promesas_pago (call via cron or manually)
CREATE OR REPLACE FUNCTION public.check_promesas_vencidas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.promesas_pago
  SET estado = 'incumplida'
  WHERE estado = 'pendiente'
    AND fecha_promesa < CURRENT_DATE;
END;
$$;


-- ************************************************************
-- PART 4: INDEXES
-- ************************************************************

CREATE INDEX IF NOT EXISTS idx_clientes_asesor_id          ON public.clientes(asesor_id);
CREATE INDEX IF NOT EXISTS idx_clientes_parent_cliente_id  ON public.clientes(parent_cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente_id         ON public.facturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estado             ON public.facturas(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha_vencimiento  ON public.facturas(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_pagos_factura_id            ON public.pagos(factura_id);
CREATE INDEX IF NOT EXISTS idx_notas_cobranza_cliente_id   ON public.notas_cobranza(cliente_id);
CREATE INDEX IF NOT EXISTS idx_promesas_pago_cliente_id    ON public.promesas_pago(cliente_id);
CREATE INDEX IF NOT EXISTS idx_promesas_pago_factura_id    ON public.promesas_pago(factura_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role     ON public.user_roles(user_id, role);

CREATE UNIQUE INDEX IF NOT EXISTS idx_facturas_numero_factura_unique
  ON public.facturas(numero_factura)
  WHERE numero_factura IS NOT NULL;


-- ************************************************************
-- DONE - Your Credit Compass database is ready!
-- ************************************************************
-- Next steps:
-- 1. Update your .env with the new Supabase URL and anon key
-- 2. Create an admin user via Supabase Auth (Dashboard > Auth)
-- 3. Insert the admin role:
--    INSERT INTO public.user_roles (user_id, role)
--    VALUES ('<USER_UUID_FROM_AUTH>', 'admin');
-- 4. Deploy the Edge Functions (seed-admin, generate-recurring-invoices)
-- ************************************************************
