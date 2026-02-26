
-- ========================================
-- 1. Nuevos campos en clientes
-- ========================================
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS ciclo_facturacion text NOT NULL DEFAULT 'mensual',
  ADD COLUMN IF NOT EXISTS dia_corte integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS dia_pago integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS limite_dias_atraso_alerta integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS estado_credito text NOT NULL DEFAULT 'activo';

-- ========================================
-- 2. Nuevos campos en facturas
-- ========================================
ALTER TABLE public.facturas
  ADD COLUMN IF NOT EXISTS numero_factura text,
  ADD COLUMN IF NOT EXISTS periodo_facturacion text,
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS dpd integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dias_gracia integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notas_cobranza text;

-- ========================================
-- 3. Tabla pagos
-- ========================================
CREATE TABLE public.pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id uuid NOT NULL REFERENCES public.facturas(id) ON DELETE CASCADE,
  monto numeric NOT NULL,
  fecha_pago date NOT NULL DEFAULT CURRENT_DATE,
  metodo text NOT NULL DEFAULT 'transferencia',
  referencia text,
  registrado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access pagos"
  ON public.pagos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Asesores see own pagos"
  ON public.pagos FOR SELECT
  TO authenticated
  USING (
    factura_id IN (
      SELECT f.id FROM public.facturas f
      WHERE f.cliente_id IN (
        SELECT c.id FROM public.clientes c
        WHERE c.asesor_id IN (
          SELECT a.id FROM public.asesores a WHERE a.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Asesores insert own pagos"
  ON public.pagos FOR INSERT
  TO authenticated
  WITH CHECK (
    factura_id IN (
      SELECT f.id FROM public.facturas f
      WHERE f.cliente_id IN (
        SELECT c.id FROM public.clientes c
        WHERE c.asesor_id IN (
          SELECT a.id FROM public.asesores a WHERE a.user_id = auth.uid()
        )
      )
    )
  );

-- ========================================
-- 4. Función: calcular DPD y actualizar estado de factura
-- ========================================
CREATE OR REPLACE FUNCTION public.update_factura_dpd_estado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total_pagado numeric;
  _monto_factura numeric;
  _fecha_venc date;
  _dias_gracia integer;
  _dpd integer;
BEGIN
  -- Get factura details
  SELECT monto, fecha_vencimiento, dias_gracia
    INTO _monto_factura, _fecha_venc, _dias_gracia
    FROM public.facturas WHERE id = NEW.factura_id;

  -- Calculate total paid
  SELECT COALESCE(SUM(monto), 0) INTO _total_pagado
    FROM public.pagos WHERE factura_id = NEW.factura_id;

  -- Calculate DPD (days past due from effective due date)
  _dpd := GREATEST(0, CURRENT_DATE - (_fecha_venc + _dias_gracia));

  -- Update factura
  UPDATE public.facturas SET
    fecha_pago = CASE WHEN _total_pagado >= _monto_factura THEN CURRENT_DATE ELSE fecha_pago END,
    estado = CASE
      WHEN _total_pagado >= _monto_factura THEN 'pagada'
      WHEN _total_pagado > 0 THEN 'parcial'
      WHEN CURRENT_DATE > (_fecha_venc + _dias_gracia) THEN 'vencida'
      ELSE 'pendiente'
    END,
    dpd = _dpd
  WHERE id = NEW.factura_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_factura_on_pago
  AFTER INSERT ON public.pagos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_factura_dpd_estado();

-- ========================================
-- 5. Tabla notas de cobranza (historial)
-- ========================================
CREATE TABLE public.notas_cobranza (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'nota',
  contenido text NOT NULL,
  registrado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notas_cobranza ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access notas_cobranza"
  ON public.notas_cobranza FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Asesores manage own notas"
  ON public.notas_cobranza FOR ALL
  TO authenticated
  USING (
    cliente_id IN (
      SELECT c.id FROM public.clientes c
      WHERE c.asesor_id IN (
        SELECT a.id FROM public.asesores a WHERE a.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    cliente_id IN (
      SELECT c.id FROM public.clientes c
      WHERE c.asesor_id IN (
        SELECT a.id FROM public.asesores a WHERE a.user_id = auth.uid()
      )
    )
  );

-- ========================================
-- 6. Tabla promesas de pago
-- ========================================
CREATE TABLE public.promesas_pago (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  factura_id uuid REFERENCES public.facturas(id) ON DELETE SET NULL,
  monto_prometido numeric NOT NULL,
  fecha_promesa date NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente',
  notas text,
  registrado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promesas_pago ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access promesas"
  ON public.promesas_pago FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Asesores manage own promesas"
  ON public.promesas_pago FOR ALL
  TO authenticated
  USING (
    cliente_id IN (
      SELECT c.id FROM public.clientes c
      WHERE c.asesor_id IN (
        SELECT a.id FROM public.asesores a WHERE a.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    cliente_id IN (
      SELECT c.id FROM public.clientes c
      WHERE c.asesor_id IN (
        SELECT a.id FROM public.asesores a WHERE a.user_id = auth.uid()
      )
    )
  );
