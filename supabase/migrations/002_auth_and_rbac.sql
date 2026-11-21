-- ==============================================================================
-- CAPESECURE BMS - PHASE 2: AUTHENTICATION, RBAC & SECURITY SCHEMA
-- ==============================================================================

-- 1. Create Role Enumeration
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM (
      'super_admin',
      'administrator',
      'project_manager',
      'finance_manager',
      'technical_staff'
    );
  END IF;
END $$;

-- 2. Create Admin Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL DEFAULT '',
  role        app_role NOT NULL DEFAULT 'technical_staff',
  phone       TEXT,
  avatar_url  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Create Configurable Role Permissions Matrix Table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role        app_role NOT NULL,
  module      TEXT NOT NULL,
  can_view    BOOLEAN NOT NULL DEFAULT FALSE,
  can_create  BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit    BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (role, module)
);

-- 4. Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_current_admin_role()
RETURNS app_role AS $$
DECLARE
  v_role app_role;
BEGIN
  SELECT role INTO v_role
  FROM public.admin_profiles
  WHERE id = auth.uid() AND is_active = TRUE;
  
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. Function to check granular module permissions
CREATE OR REPLACE FUNCTION public.has_permission(
  p_module TEXT,
  p_action TEXT -- 'view', 'create', 'edit', 'delete'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role app_role;
  v_allowed BOOLEAN := FALSE;
BEGIN
  v_role := public.get_current_admin_role();
  
  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Super admin has universal bypass
  IF v_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  SELECT 
    CASE p_action
      WHEN 'view'   THEN can_view
      WHEN 'create' THEN can_create
      WHEN 'edit'   THEN can_edit
      WHEN 'delete' THEN can_delete
      ELSE FALSE
    END INTO v_allowed
  FROM public.role_permissions
  WHERE role = v_role AND module = p_module;
  
  RETURN COALESCE(v_allowed, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6. Trigger to automatically provision profile when an admin signs up
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS TRIGGER AS $$
DECLARE
  v_count INT;
  v_role app_role;
  v_full_name TEXT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.admin_profiles;
  
  -- First registered user is automatically Super Admin
  IF v_count = 0 THEN
    v_role := 'super_admin'::app_role;
  ELSE
    -- Check role provided in user metadata, fallback to technical_staff
    BEGIN
      v_role := COALESCE(
        (NEW.raw_user_meta_data->>'role')::app_role,
        'technical_staff'::app_role
      );
    EXCEPTION WHEN OTHERS THEN
      v_role := 'technical_staff'::app_role;
    END;
  END IF;

  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.admin_profiles (id, email, full_name, role, is_active)
  VALUES (NEW.id, NEW.email, v_full_name, v_role, TRUE)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = CASE WHEN admin_profiles.full_name = '' THEN EXCLUDED.full_name ELSE admin_profiles.full_name END;

  -- Log action into audit_logs
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    NEW.id,
    'ADMIN_USER_REGISTERED',
    'admin_profile',
    NEW.id,
    jsonb_build_object('email', NEW.email, 'assigned_role', v_role)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_admin_user();

-- 7. Seed Default Role Permissions
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
  -- Super Admin: Full Permissions across all modules
  ('super_admin', 'overview',          TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'leads',             TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'clients',           TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'requirements',      TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'quotations',        TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'agreements',        TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'payments',          TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'invoices',          TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'projects',          TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'tasks',             TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'design-approvals',  TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'testing',           TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'deployments',       TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'handover',          TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'maintenance',       TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'monitoring',        TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'tickets',           TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'documents',         TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'reports',           TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'settings',          TRUE, TRUE, TRUE, TRUE),

  -- Administrator: Full Operational and Financial, can view settings but not delete system records
  ('administrator', 'overview',          TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'leads',             TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'clients',           TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'requirements',      TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'quotations',        TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'agreements',        TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'payments',          TRUE, TRUE, TRUE, FALSE),
  ('administrator', 'invoices',          TRUE, TRUE, TRUE, FALSE),
  ('administrator', 'projects',          TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'tasks',             TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'design-approvals',  TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'testing',           TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'deployments',       TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'handover',          TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'maintenance',       TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'monitoring',        TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'tickets',           TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'documents',         TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'reports',           TRUE, FALSE, FALSE, FALSE),
  ('administrator', 'settings',          TRUE, FALSE, TRUE, FALSE),

  -- Project Manager: Projects, Tasks, Requirements, Design, Deployments, Handover, Support
  ('project_manager', 'overview',          TRUE, FALSE, FALSE, FALSE),
  ('project_manager', 'leads',             TRUE, FALSE, FALSE, FALSE),
  ('project_manager', 'clients',           TRUE, FALSE, TRUE, FALSE),
  ('project_manager', 'requirements',      TRUE, TRUE, TRUE, FALSE),
  ('project_manager', 'quotations',        TRUE, FALSE, FALSE, FALSE),
  ('project_manager', 'agreements',        TRUE, FALSE, FALSE, FALSE),
  ('project_manager', 'payments',          FALSE, FALSE, FALSE, FALSE),
  ('project_manager', 'invoices',          FALSE, FALSE, FALSE, FALSE),
  ('project_manager', 'projects',          TRUE, TRUE, TRUE, FALSE),
  ('project_manager', 'tasks',             TRUE, TRUE, TRUE, TRUE),
  ('project_manager', 'design-approvals',  TRUE, TRUE, TRUE, FALSE),
  ('project_manager', 'testing',           TRUE, TRUE, TRUE, FALSE),
  ('project_manager', 'deployments',       TRUE, TRUE, TRUE, FALSE),
  ('project_manager', 'handover',          TRUE, TRUE, TRUE, FALSE),
  ('project_manager', 'maintenance',       TRUE, FALSE, TRUE, FALSE),
  ('project_manager', 'monitoring',        TRUE, FALSE, FALSE, FALSE),
  ('project_manager', 'tickets',           TRUE, TRUE, TRUE, FALSE),
  ('project_manager', 'documents',         TRUE, TRUE, TRUE, FALSE),
  ('project_manager', 'reports',           TRUE, FALSE, FALSE, FALSE),
  ('project_manager', 'settings',          FALSE, FALSE, FALSE, FALSE),

  -- Finance Manager: Quotes, Agreements, Payments, Invoices, Financial Reports, Clients
  ('finance_manager', 'overview',          TRUE, FALSE, FALSE, FALSE),
  ('finance_manager', 'leads',             TRUE, FALSE, FALSE, FALSE),
  ('finance_manager', 'clients',           TRUE, FALSE, TRUE, FALSE),
  ('finance_manager', 'requirements',      TRUE, FALSE, FALSE, FALSE),
  ('finance_manager', 'quotations',        TRUE, TRUE, TRUE, TRUE),
  ('finance_manager', 'agreements',        TRUE, TRUE, TRUE, FALSE),
  ('finance_manager', 'payments',          TRUE, TRUE, TRUE, FALSE),
  ('finance_manager', 'invoices',          TRUE, TRUE, TRUE, FALSE),
  ('finance_manager', 'projects',          TRUE, FALSE, FALSE, FALSE),
  ('finance_manager', 'tasks',             FALSE, FALSE, FALSE, FALSE),
  ('finance_manager', 'design-approvals',  FALSE, FALSE, FALSE, FALSE),
  ('finance_manager', 'testing',           FALSE, FALSE, FALSE, FALSE),
  ('finance_manager', 'deployments',       FALSE, FALSE, FALSE, FALSE),
  ('finance_manager', 'handover',          FALSE, FALSE, FALSE, FALSE),
  ('finance_manager', 'maintenance',       TRUE, TRUE, TRUE, FALSE),
  ('finance_manager', 'monitoring',        FALSE, FALSE, FALSE, FALSE),
  ('finance_manager', 'tickets',           TRUE, FALSE, FALSE, FALSE),
  ('finance_manager', 'documents',         TRUE, TRUE, TRUE, FALSE),
  ('finance_manager', 'reports',           TRUE, TRUE, FALSE, FALSE),
  ('finance_manager', 'settings',          FALSE, FALSE, FALSE, FALSE),

  -- Technical Staff: Projects, Tasks, QA Testing, Deployments, Health Monitoring, Support Tickets
  ('technical_staff', 'overview',          TRUE, FALSE, FALSE, FALSE),
  ('technical_staff', 'leads',             FALSE, FALSE, FALSE, FALSE),
  ('technical_staff', 'clients',           FALSE, FALSE, FALSE, FALSE),
  ('technical_staff', 'requirements',      TRUE, FALSE, FALSE, FALSE),
  ('technical_staff', 'quotations',        FALSE, FALSE, FALSE, FALSE),
  ('technical_staff', 'agreements',        FALSE, FALSE, FALSE, FALSE),
  ('technical_staff', 'payments',          FALSE, FALSE, FALSE, FALSE),
  ('technical_staff', 'invoices',          FALSE, FALSE, FALSE, FALSE),
  ('technical_staff', 'projects',          TRUE, FALSE, TRUE, FALSE),
  ('technical_staff', 'tasks',             TRUE, TRUE, TRUE, FALSE),
  ('technical_staff', 'design-approvals',  TRUE, FALSE, TRUE, FALSE),
  ('technical_staff', 'testing',           TRUE, TRUE, TRUE, FALSE),
  ('technical_staff', 'deployments',       TRUE, TRUE, TRUE, FALSE),
  ('technical_staff', 'handover',          TRUE, FALSE, TRUE, FALSE),
  ('technical_staff', 'maintenance',       TRUE, FALSE, TRUE, FALSE),
  ('technical_staff', 'monitoring',        TRUE, TRUE, TRUE, FALSE),
  ('technical_staff', 'tickets',           TRUE, TRUE, TRUE, FALSE),
  ('technical_staff', 'documents',         TRUE, TRUE, TRUE, FALSE),
  ('technical_staff', 'reports',           FALSE, FALSE, FALSE, FALSE),
  ('technical_staff', 'settings',          FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (role, module) DO UPDATE
  SET can_view   = EXCLUDED.can_view,
      can_create = EXCLUDED.can_create,
      can_edit   = EXCLUDED.can_edit,
      can_delete = EXCLUDED.can_delete,
      updated_at = NOW();

-- 8. Enable Row Level Security (RLS) on RBAC Tables
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for admin_profiles
DROP POLICY IF EXISTS "Active admins can view profile directory" ON public.admin_profiles;
CREATE POLICY "Active admins can view profile directory"
  ON public.admin_profiles FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Admins can update their own profile" ON public.admin_profiles;
CREATE POLICY "Admins can update their own profile"
  ON public.admin_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Super Admins can manage all admin profiles" ON public.admin_profiles;
CREATE POLICY "Super Admins can manage all admin profiles"
  ON public.admin_profiles FOR ALL
  TO authenticated
  USING (public.get_current_admin_role() IN ('super_admin', 'administrator'))
  WITH CHECK (public.get_current_admin_role() IN ('super_admin', 'administrator'));

-- Policies for role_permissions
DROP POLICY IF EXISTS "Authenticated users can view permissions matrix" ON public.role_permissions;
CREATE POLICY "Authenticated users can view permissions matrix"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Super Admin can update role permissions" ON public.role_permissions;
CREATE POLICY "Super Admin can update role permissions"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (public.get_current_admin_role() = 'super_admin')
  WITH CHECK (public.get_current_admin_role() = 'super_admin');

-- 9. Secure Financial Tables with Module RLS
-- Payments RLS
DROP POLICY IF EXISTS "Payments view permission policy" ON public.payments;
CREATE POLICY "Payments view permission policy"
  ON public.payments FOR SELECT
  TO authenticated
  USING (public.has_permission('payments', 'view'));

DROP POLICY IF EXISTS "Payments insert permission policy" ON public.payments;
CREATE POLICY "Payments insert permission policy"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (public.has_permission('payments', 'create'));

DROP POLICY IF EXISTS "Payments update permission policy" ON public.payments;
CREATE POLICY "Payments update permission policy"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (public.has_permission('payments', 'edit'))
  WITH CHECK (public.has_permission('payments', 'edit'));

-- Invoices RLS
DROP POLICY IF EXISTS "Invoices view permission policy" ON public.invoices;
CREATE POLICY "Invoices view permission policy"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (public.has_permission('invoices', 'view'));

DROP POLICY IF EXISTS "Invoices insert permission policy" ON public.invoices;
CREATE POLICY "Invoices insert permission policy"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (public.has_permission('invoices', 'create'));

DROP POLICY IF EXISTS "Invoices update permission policy" ON public.invoices;
CREATE POLICY "Invoices update permission policy"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (public.has_permission('invoices', 'edit'))
  WITH CHECK (public.has_permission('invoices', 'edit'));

-- 10. Audit Logging Helper Function
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), p_action, p_resource_type, p_resource_id, p_metadata)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
