
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'asesor');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. RLS on user_roles: users can read their own roles
CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Add user_id to asesores to link auth accounts
ALTER TABLE public.asesores ADD COLUMN user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6. Function to auto-link asesor and assign role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _asesor_id uuid;
BEGIN
  -- Check if email matches an asesor
  SELECT id INTO _asesor_id FROM public.asesores WHERE email = NEW.email;
  
  IF _asesor_id IS NOT NULL THEN
    -- Link asesor to auth user
    UPDATE public.asesores SET user_id = NEW.id WHERE id = _asesor_id;
    -- Assign asesor role
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'asesor');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Update RLS on asesores - admins full access, asesores see themselves
DROP POLICY IF EXISTS "Allow all access to asesores" ON public.asesores;

CREATE POLICY "Admins full access asesores"
  ON public.asesores FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Asesores read own record"
  ON public.asesores FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 8. Update RLS on clientes
DROP POLICY IF EXISTS "Allow all access to clientes" ON public.clientes;

CREATE POLICY "Admins full access clientes"
  ON public.clientes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Asesores see own clientes"
  ON public.clientes FOR SELECT
  TO authenticated
  USING (
    asesor_id IN (SELECT id FROM public.asesores WHERE user_id = auth.uid())
  );

-- 9. Update RLS on facturas
DROP POLICY IF EXISTS "Allow all access to facturas" ON public.facturas;

CREATE POLICY "Admins full access facturas"
  ON public.facturas FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Asesores see own facturas"
  ON public.facturas FOR SELECT
  TO authenticated
  USING (
    cliente_id IN (
      SELECT c.id FROM public.clientes c
      WHERE c.asesor_id IN (SELECT a.id FROM public.asesores a WHERE a.user_id = auth.uid())
    )
  );
