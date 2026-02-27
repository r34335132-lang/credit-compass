-- ============================================================
-- 003_functions_triggers.sql
-- Credit Compass - Functions & Triggers
-- Run AFTER 002_rls_policies.sql
-- ============================================================

-- ============================================================
-- 1. TRIGGER FUNCTION: Auto-calculate DPD on facturas
-- Runs BEFORE INSERT or UPDATE on facturas.
-- - For unpaid invoices: DPD = days since fecha_vencimiento
-- - Automatically marks 'pendiente' as 'vencida' when overdue
-- - For paid invoices: DPD = days between pago and vencimiento
-- ============================================================
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
-- 2. TRIGGER FUNCTION: Auto-update factura estado after pago
-- Runs AFTER INSERT on pagos.
-- - Sums all payments for the factura
-- - If total >= monto -> 'pagada'
-- - Else -> 'parcial'
-- ============================================================
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

-- ============================================================
-- 3. TRIGGER FUNCTION: Auto-check promesas_pago expiration
-- Marks promises as 'incumplida' when fecha_promesa has passed
-- and estado is still 'pendiente'. Called on UPDATE or via cron.
-- ============================================================
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

-- ============================================================
-- END 003_functions_triggers.sql
-- ============================================================
