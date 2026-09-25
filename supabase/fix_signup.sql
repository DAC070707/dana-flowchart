-- Helpers that bypass RLS so policies on organization_members don't recurse
CREATE OR REPLACE FUNCTION public.is_org_member(p_org UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = p_org AND user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS members_read ON organization_members;
CREATE POLICY members_read ON organization_members FOR SELECT USING (
  user_id = auth.uid() OR public.is_org_member(org_id)
);

-- Create an organization + admin membership for every new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name TEXT;
  v_slug TEXT;
  v_org UUID;
BEGIN
  v_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'org_name'), ''), split_part(NEW.email, '@', 1), 'Mi Empresa');
  v_slug := regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g') || '-' || substr(NEW.id::text, 1, 8);

  INSERT INTO organizations (name, slug, plan, max_users, max_processes)
  VALUES (v_name, v_slug, 'free', 3, 5)
  RETURNING id INTO v_org;

  INSERT INTO organization_members (org_id, user_id, role)
  VALUES (v_org, NEW.id, 'admin');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
