-- ============================================================
-- CREDIT COMPASS - Diagnostic Query (READ-ONLY)
-- ============================================================
-- Run this in the Supabase SQL Editor to see current state.
-- It does NOT modify anything.
-- ============================================================

-- 1. List all tables in the public schema
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Check columns on 'clientes'
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'clientes'
ORDER BY ordinal_position;

-- 3. Check columns on 'facturas'
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'facturas'
ORDER BY ordinal_position;

-- 4. Check columns on 'pagos'
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'pagos'
ORDER BY ordinal_position;

-- 5. Check columns on 'notas_cobranza'
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'notas_cobranza'
ORDER BY ordinal_position;

-- 6. Check columns on 'promesas_pago'
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'promesas_pago'
ORDER BY ordinal_position;

-- 7. Check columns on 'user_roles'
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_roles'
ORDER BY ordinal_position;

-- 8. Check all foreign keys
SELECT
  tc.constraint_name,
  tc.table_name AS source_table,
  kcu.column_name AS source_column,
  ccu.table_name AS target_table,
  ccu.column_name AS target_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- 9. Check RLS status per table
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 10. List all RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 11. Check for the app_role enum
SELECT typname, enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname = 'app_role';

-- 12. Check existing triggers
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 13. Check functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 14. Check row counts
SELECT 'asesores' AS tabla, COUNT(*) FROM public.asesores
UNION ALL SELECT 'clientes', COUNT(*) FROM public.clientes
UNION ALL SELECT 'facturas', COUNT(*) FROM public.facturas
UNION ALL SELECT 'pagos', COUNT(*) FROM public.pagos
UNION ALL SELECT 'notas_cobranza', COUNT(*) FROM public.notas_cobranza
UNION ALL SELECT 'promesas_pago', COUNT(*) FROM public.promesas_pago
UNION ALL SELECT 'user_roles', COUNT(*) FROM public.user_roles;
