-- ============================================================
-- CREDIT COMPASS - Full Diagnostic & Fix Migration
-- ============================================================
-- This migration is ADDITIVE ONLY. It does NOT recreate tables.
-- It uses IF NOT EXISTS / IF EXISTS guards everywhere.
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor).
-- ============================================================

-- ============================================================
-- 1. ENSURE ALL REQUIRED COLUMNS EXIST ON `clientes`
-- ============================================================
-- Required columns:
--   id (uuid PK, default gen_random_uuid())
--   nombre (text NOT NULL)
--   asesor_id (uuid FK -> asesores.id, nullable)
--   linea_credito (numeric, default 0)
--   fecha_registro (date, default CURRENT_DATE)
--   parent_cliente_id (uuid FK -> clientes.id, nullable)
--   es_grupo (boolean, default false)
--   ciclo_facturacion (text, default 'mensual')
--   dia_corte (int, default 1)
--   dia_pago (int, default 15)
--   limite_dias_atraso_alerta (int, default 5)
--   estado_credito (text, default 'activo')
--   created_at (timestamptz, default now())

DO $$
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clientes' AND column_name='parent_cliente_id') THEN
    ALTER TABLE public.clientes ADD COLUMN parent_cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clientes' AND column_name='es_grupo') THEN
    ALTER TABLE public.clientes ADD COLUMN es_grupo boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clientes' AND column_name='ciclo_facturacion') THEN
    ALTER TABLE public.clientes ADD COLUMN ciclo_facturacion text NOT NULL DEFAULT 'mensual';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clientes' AND column_name='dia_corte') THEN
    ALTER TABLE public.clientes ADD COLUMN dia_corte int NOT NULL DEFAULT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clientes' AND column_name='dia_pago') THEN
    ALTER TABLE public.clientes ADD COLUMN dia_pago int NOT NULL DEFAULT 15;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clientes' AND column_name='limite_dias_atraso_alerta') THEN
    ALTER TABLE public.clientes ADD COLUMN limite_dias_atraso_alerta int NOT NULL DEFAULT 5;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clientes' AND column_name='estado_credito') THEN
    ALTER TABLE public.clientes ADD COLUMN estado_credito text NOT NULL DEFAULT 'activo';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clientes' AND column_name='linea_credito') THEN
    ALTER TABLE public.clientes ADD COLUMN linea_credito numeric NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clientes' AND column_name='fecha_registro') THEN
    ALTER TABLE public.clientes ADD COLUMN fecha_registro date NOT NULL DEFAULT CURRENT_DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clientes' AND column_name='asesor_id') THEN
    ALTER TABLE public.clientes ADD COLUMN asesor_id uuid REFERENCES public.asesores(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 2. ENSURE `facturas` HAS ALL REQUIRED COLUMNS
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='facturas' AND column_name='numero_factura') THEN
    ALTER TABLE public.facturas ADD COLUMN numero_factura text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='facturas' AND column_name='periodo_facturacion') THEN
    ALTER TABLE public.facturas ADD COLUMN periodo_facturacion text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='facturas' AND column_name='tipo') THEN
    ALTER TABLE public.facturas ADD COLUMN tipo text NOT NULL DEFAULT 'manual';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='facturas' AND column_name='dpd') THEN
    ALTER TABLE public.facturas ADD COLUMN dpd int NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='facturas' AND column_name='dias_gracia') THEN
    ALTER TABLE public.facturas ADD COLUMN dias_gracia int NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='facturas' AND column_name='notas_cobranza') THEN
    ALTER TABLE public.facturas ADD COLUMN notas_cobranza text;
  END IF;
END $$;

-- Unique index on numero_factura (partial, only non-null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_facturas_numero_factura_unique
  ON public.facturas (numero_factura)
  WHERE numero_factura IS NOT NULL;

-- ============================================================
-- 3. ENSURE `pagos` TABLE EXISTS WITH ALL COLUMNS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id uuid NOT NULL REFERENCES public.facturas(id) ON DELETE CASCADE,
  monto numeric NOT NULL,
  fecha_pago date NOT NULL DEFAULT CURRENT_DATE,
  metodo text NOT NULL DEFAULT 'transferencia',
  referencia text,
  registrado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. ENSURE `notas_cobranza` TABLE EXISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notas_cobranza (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'nota',
  contenido text NOT NULL,
  registrado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. ENSURE `promesas_pago` TABLE EXISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.promesas_pago (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  factura_id uuid REFERENCES public.facturas(id) ON DELETE SET NULL,
  monto_prometido numeric NOT NULL,
  fecha_promesa date NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente',
  notas text,
  registrado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. ENSURE `user_roles` TABLE AND `app_role` ENUM EXIST
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'asesor');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL
);

-- Ensure unique constraint on user_id for user_roles
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);

-- ============================================================
-- 7. ENSURE `has_role` FUNCTION EXISTS
-- ============================================================
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

-- ============================================================
-- 8. FIX FOREIGN KEYS (idempotent)
-- ============================================================
-- clientes.asesor_id -> asesores.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'clientes_asesor_id_fkey'
      AND table_name = 'clientes'
  ) THEN
    BEGIN
      ALTER TABLE public.clientes
        ADD CONSTRAINT clientes_asesor_id_fkey
        FOREIGN KEY (asesor_id) REFERENCES public.asesores(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- clientes.parent_cliente_id -> clientes.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'clientes_parent_cliente_id_fkey'
      AND table_name = 'clientes'
  ) THEN
    BEGIN
      ALTER TABLE public.clientes
        ADD CONSTRAINT clientes_parent_cliente_id_fkey
        FOREIGN KEY (parent_cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- facturas.cliente_id -> clientes.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'facturas_cliente_id_fkey'
      AND table_name = 'facturas'
  ) THEN
    BEGIN
      ALTER TABLE public.facturas
        ADD CONSTRAINT facturas_cliente_id_fkey
        FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- pagos.factura_id -> facturas.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pagos_factura_id_fkey'
      AND table_name = 'pagos'
  ) THEN
    BEGIN
      ALTER TABLE public.pagos
        ADD CONSTRAINT pagos_factura_id_fkey
        FOREIGN KEY (factura_id) REFERENCES public.facturas(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- notas_cobranza.cliente_id -> clientes.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'notas_cobranza_cliente_id_fkey'
      AND table_name = 'notas_cobranza'
  ) THEN
    BEGIN
      ALTER TABLE public.notas_cobranza
        ADD CONSTRAINT notas_cobranza_cliente_id_fkey
        FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- promesas_pago.cliente_id -> clientes.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'promesas_pago_cliente_id_fkey'
      AND table_name = 'promesas_pago'
  ) THEN
    BEGIN
      ALTER TABLE public.promesas_pago
        ADD CONSTRAINT promesas_pago_cliente_id_fkey
        FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- promesas_pago.factura_id -> facturas.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'promesas_pago_factura_id_fkey'
      AND table_name = 'promesas_pago'
  ) THEN
    BEGIN
      ALTER TABLE public.promesas_pago
        ADD CONSTRAINT promesas_pago_factura_id_fkey
        FOREIGN KEY (factura_id) REFERENCES public.facturas(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ============================================================
-- 9. ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE public.asesores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_cobranza ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promesas_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 10. FIX RLS POLICIES
-- ============================================================
-- Strategy: Authenticated users can SELECT everything.
-- INSERT/UPDATE/DELETE restricted to authenticated users.
-- This ensures the anon key CANNOT modify data,
-- but any logged-in user can read and write.

-- Helper: Drop policy if exists (idempotent)
-- We recreate all policies to ensure they are correct.

-- === ASESORES ===
DROP POLICY IF EXISTS "asesores_select" ON public.asesores;
DROP POLICY IF EXISTS "asesores_insert" ON public.asesores;
DROP POLICY IF EXISTS "asesores_update" ON public.asesores;
DROP POLICY IF EXISTS "asesores_delete" ON public.asesores;
-- Legacy policy names
DROP POLICY IF EXISTS "Allow authenticated read asesores" ON public.asesores;
DROP POLICY IF EXISTS "Allow authenticated insert asesores" ON public.asesores;
DROP POLICY IF EXISTS "Allow authenticated update asesores" ON public.asesores;
DROP POLICY IF EXISTS "Allow authenticated delete asesores" ON public.asesores;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.asesores;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.asesores;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.asesores;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.asesores;

CREATE POLICY "asesores_select" ON public.asesores FOR SELECT TO authenticated USING (true);
CREATE POLICY "asesores_insert" ON public.asesores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "asesores_update" ON public.asesores FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "asesores_delete" ON public.asesores FOR DELETE TO authenticated USING (true);

-- === CLIENTES ===
DROP POLICY IF EXISTS "clientes_select" ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert" ON public.clientes;
DROP POLICY IF EXISTS "clientes_update" ON public.clientes;
DROP POLICY IF EXISTS "clientes_delete" ON public.clientes;
DROP POLICY IF EXISTS "Allow authenticated read clientes" ON public.clientes;
DROP POLICY IF EXISTS "Allow authenticated insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Allow authenticated update clientes" ON public.clientes;
DROP POLICY IF EXISTS "Allow authenticated delete clientes" ON public.clientes;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.clientes;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.clientes;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.clientes;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.clientes;

CREATE POLICY "clientes_select" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "clientes_insert" ON public.clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "clientes_update" ON public.clientes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "clientes_delete" ON public.clientes FOR DELETE TO authenticated USING (true);

-- === FACTURAS ===
DROP POLICY IF EXISTS "facturas_select" ON public.facturas;
DROP POLICY IF EXISTS "facturas_insert" ON public.facturas;
DROP POLICY IF EXISTS "facturas_update" ON public.facturas;
DROP POLICY IF EXISTS "facturas_delete" ON public.facturas;
DROP POLICY IF EXISTS "Allow authenticated read facturas" ON public.facturas;
DROP POLICY IF EXISTS "Allow authenticated insert facturas" ON public.facturas;
DROP POLICY IF EXISTS "Allow authenticated update facturas" ON public.facturas;
DROP POLICY IF EXISTS "Allow authenticated delete facturas" ON public.facturas;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.facturas;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.facturas;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.facturas;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.facturas;

CREATE POLICY "facturas_select" ON public.facturas FOR SELECT TO authenticated USING (true);
CREATE POLICY "facturas_insert" ON public.facturas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "facturas_update" ON public.facturas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "facturas_delete" ON public.facturas FOR DELETE TO authenticated USING (true);

-- === PAGOS ===
DROP POLICY IF EXISTS "pagos_select" ON public.pagos;
DROP POLICY IF EXISTS "pagos_insert" ON public.pagos;
DROP POLICY IF EXISTS "pagos_update" ON public.pagos;
DROP POLICY IF EXISTS "pagos_delete" ON public.pagos;
DROP POLICY IF EXISTS "Allow authenticated read pagos" ON public.pagos;
DROP POLICY IF EXISTS "Allow authenticated insert pagos" ON public.pagos;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.pagos;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.pagos;

CREATE POLICY "pagos_select" ON public.pagos FOR SELECT TO authenticated USING (true);
CREATE POLICY "pagos_insert" ON public.pagos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pagos_update" ON public.pagos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pagos_delete" ON public.pagos FOR DELETE TO authenticated USING (true);

-- === NOTAS_COBRANZA ===
DROP POLICY IF EXISTS "notas_cobranza_select" ON public.notas_cobranza;
DROP POLICY IF EXISTS "notas_cobranza_insert" ON public.notas_cobranza;
DROP POLICY IF EXISTS "notas_cobranza_update" ON public.notas_cobranza;
DROP POLICY IF EXISTS "notas_cobranza_delete" ON public.notas_cobranza;
DROP POLICY IF EXISTS "Allow authenticated read notas_cobranza" ON public.notas_cobranza;
DROP POLICY IF EXISTS "Allow authenticated insert notas_cobranza" ON public.notas_cobranza;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.notas_cobranza;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.notas_cobranza;

CREATE POLICY "notas_cobranza_select" ON public.notas_cobranza FOR SELECT TO authenticated USING (true);
CREATE POLICY "notas_cobranza_insert" ON public.notas_cobranza FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notas_cobranza_update" ON public.notas_cobranza FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "notas_cobranza_delete" ON public.notas_cobranza FOR DELETE TO authenticated USING (true);

-- === PROMESAS_PAGO ===
DROP POLICY IF EXISTS "promesas_pago_select" ON public.promesas_pago;
DROP POLICY IF EXISTS "promesas_pago_insert" ON public.promesas_pago;
DROP POLICY IF EXISTS "promesas_pago_update" ON public.promesas_pago;
DROP POLICY IF EXISTS "promesas_pago_delete" ON public.promesas_pago;
DROP POLICY IF EXISTS "Allow authenticated read promesas_pago" ON public.promesas_pago;
DROP POLICY IF EXISTS "Allow authenticated insert promesas_pago" ON public.promesas_pago;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.promesas_pago;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.promesas_pago;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.promesas_pago;

CREATE POLICY "promesas_pago_select" ON public.promesas_pago FOR SELECT TO authenticated USING (true);
CREATE POLICY "promesas_pago_insert" ON public.promesas_pago FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "promesas_pago_update" ON public.promesas_pago FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "promesas_pago_delete" ON public.promesas_pago FOR DELETE TO authenticated USING (true);

-- === USER_ROLES ===
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
DROP POLICY IF EXISTS "Allow authenticated read user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.user_roles;
DROP POLICY IF EXISTS "Allow admin insert user_roles" ON public.user_roles;

CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated USING (true);
-- Only service_role should insert roles, but allow admin via has_role
CREATE POLICY "user_roles_insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role('admin'::public.app_role, auth.uid()));

-- ============================================================
-- 11. DPD AUTO-UPDATE TRIGGER
-- ============================================================
-- This trigger recalculates DPD on facturas whenever they are
-- inserted or updated (if not yet paid and past due).
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

-- ============================================================
-- 12. AUTO-UPDATE factura estado AFTER pago INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_factura_after_pago()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_monto_factura numeric;
  v_total_pagado numeric;
BEGIN
  SELECT monto INTO v_monto_factura FROM public.facturas WHERE id = NEW.factura_id;
  SELECT COALESCE(SUM(monto), 0) INTO v_total_pagado FROM public.pagos WHERE factura_id = NEW.factura_id;

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

-- ============================================================
-- 13. PERFORMANCE INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clientes_asesor_id ON public.clientes(asesor_id);
CREATE INDEX IF NOT EXISTS idx_clientes_parent_cliente_id ON public.clientes(parent_cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente_id ON public.facturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON public.facturas(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha_vencimiento ON public.facturas(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_pagos_factura_id ON public.pagos(factura_id);
CREATE INDEX IF NOT EXISTS idx_notas_cobranza_cliente_id ON public.notas_cobranza(cliente_id);
CREATE INDEX IF NOT EXISTS idx_promesas_pago_cliente_id ON public.promesas_pago(cliente_id);
CREATE INDEX IF NOT EXISTS idx_promesas_pago_factura_id ON public.promesas_pago(factura_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON public.user_roles(user_id, role);

-- ============================================================
-- 14. BATCH UPDATE EXISTING DPD VALUES
-- ============================================================
-- Recalculate DPD for all unpaid invoices
UPDATE public.facturas
SET dpd = GREATEST(0, CURRENT_DATE - fecha_vencimiento)
WHERE estado IN ('pendiente', 'vencida', 'parcial') AND fecha_pago IS NULL;

-- Mark overdue invoices that are still 'pendiente'
UPDATE public.facturas
SET estado = 'vencida'
WHERE estado = 'pendiente'
  AND fecha_vencimiento < CURRENT_DATE
  AND fecha_pago IS NULL;

-- ============================================================
-- DONE
-- ============================================================
