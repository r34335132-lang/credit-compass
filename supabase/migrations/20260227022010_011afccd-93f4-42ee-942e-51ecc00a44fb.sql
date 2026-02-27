
-- Add client group hierarchy
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS parent_cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS es_grupo boolean NOT NULL DEFAULT false;

-- Add unique constraint on numero_factura (used as folio)
-- First remove nulls that would conflict, then add partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_facturas_numero_factura_unique ON public.facturas (numero_factura) WHERE numero_factura IS NOT NULL;

-- Update RLS for clientes to allow reading sub-clients
-- Admins already have full access, asesores need to see sub-clients of their clients
DROP POLICY IF EXISTS "Asesores see own clientes" ON public.clientes;
CREATE POLICY "Asesores see own clientes" ON public.clientes FOR SELECT USING (
  asesor_id IN (SELECT id FROM asesores WHERE user_id = auth.uid())
  OR parent_cliente_id IN (
    SELECT id FROM clientes WHERE asesor_id IN (SELECT id FROM asesores WHERE user_id = auth.uid())
  )
);
