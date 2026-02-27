-- ============================================================
-- 001_schema.sql
-- Credit Compass - Complete Schema (clean install)
-- Run this FIRST on a brand-new Supabase project.
-- ============================================================

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
  user_id     uuid,                              -- FK to auth.users (nullable, linked later)
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.asesores IS 'Asesores de credito que gestionan clientes';

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

COMMENT ON TABLE public.clientes IS 'Clientes/grupos de credito';

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

COMMENT ON TABLE public.facturas IS 'Facturas emitidas a clientes';

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

COMMENT ON TABLE public.pagos IS 'Pagos parciales o totales asociados a facturas';

-- 6. TABLE: notas_cobranza
CREATE TABLE IF NOT EXISTS public.notas_cobranza (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      uuid    NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo            text    NOT NULL DEFAULT 'nota',
  contenido       text    NOT NULL,
  registrado_por  uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notas_cobranza IS 'Notas y gestiones de cobranza por cliente';

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

COMMENT ON TABLE public.promesas_pago IS 'Promesas de pago registradas por asesores';

-- 8. TABLE: user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id      uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid            NOT NULL,
  role    public.app_role NOT NULL
);

-- Unique: one role per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

COMMENT ON TABLE public.user_roles IS 'Roles de aplicacion (admin/asesor) por usuario auth';

-- ============================================================
-- 9. FUNCTION: has_role (needed by RLS policies in 002)
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

COMMENT ON FUNCTION public.has_role IS 'Check if a user has a specific app role';

-- ============================================================
-- END 001_schema.sql
-- ============================================================
