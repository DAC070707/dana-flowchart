-- Projects (internal or external clients), mandatory on every process, and org chart

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('internal', 'external')),
  name TEXT NOT NULL CHECK (btrim(name) <> ''),
  business_name TEXT,
  ruc TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT external_requires_company CHECK (
    kind = 'internal'
    OR (business_name IS NOT NULL AND btrim(business_name) <> '' AND ruc ~ '^(10|15|17|20)[0-9]{9}$')
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_project_ruc ON projects (org_id, ruc) WHERE ruc IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects (org_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS projects_read ON projects;
CREATE POLICY projects_read ON projects FOR SELECT USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS projects_write ON projects;
CREATE POLICY projects_write ON projects FOR ALL
  USING (public.has_org_role(org_id, ARRAY['admin', 'manager']))
  WITH CHECK (public.has_org_role(org_id, ARRAY['admin', 'manager']));

-- Every process belongs to a project; existing ones go to an internal "General" project
ALTER TABLE processes ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE RESTRICT;

INSERT INTO projects (org_id, kind, name)
SELECT DISTINCT p.org_id, 'internal', 'General'
FROM processes p
WHERE p.project_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM projects pr WHERE pr.org_id = p.org_id AND pr.kind = 'internal' AND pr.name = 'General');

UPDATE processes p SET project_id = (
  SELECT pr.id FROM projects pr
  WHERE pr.org_id = p.org_id AND pr.kind = 'internal' AND pr.name = 'General'
  LIMIT 1
)
WHERE p.project_id IS NULL;

ALTER TABLE processes ALTER COLUMN project_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_processes_project ON processes (project_id);

-- Tasks carry their project so the month view can be filtered by client
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE RESTRICT;
ALTER TABLE task_assignments DISABLE TRIGGER guard_tasks_closed;
UPDATE task_assignments t SET project_id = p.project_id
FROM processes p WHERE t.process_id = p.id AND t.project_id IS NULL;
ALTER TABLE task_assignments ENABLE TRIGGER guard_tasks_closed;
CREATE INDEX IF NOT EXISTS idx_tasks_project ON task_assignments (project_id);

-- A process or task can only point to a project of its own organization
CREATE OR REPLACE FUNCTION public.check_project_org()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.project_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id AND org_id = NEW.org_id) THEN
    RAISE EXCEPTION 'El proyecto no pertenece a esta organización';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS processes_project_org ON processes;
CREATE TRIGGER processes_project_org BEFORE INSERT OR UPDATE OF project_id, org_id ON processes
  FOR EACH ROW EXECUTE FUNCTION public.check_project_org();

DROP TRIGGER IF EXISTS tasks_project_org ON task_assignments;
CREATE TRIGGER tasks_project_org BEFORE INSERT OR UPDATE OF project_id, org_id ON task_assignments
  FOR EACH ROW EXECUTE FUNCTION public.check_project_org();

-- Month sync now also respects the project's active flag and copies project_id
CREATE OR REPLACE FUNCTION public.ensure_period(p_org UUID, p_period DATE)
RETURNS periods LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v periods;
  v_start DATE := date_trunc('month', p_period)::date;
  v_last INT := EXTRACT(DAY FROM (date_trunc('month', p_period) + INTERVAL '1 month - 1 day'))::int;
BEGIN
  IF NOT public.is_org_member(p_org) THEN
    RAISE EXCEPTION 'Sin acceso a esta organización';
  END IF;

  INSERT INTO periods (org_id, period) VALUES (p_org, v_start)
  ON CONFLICT (org_id, period) DO NOTHING;
  SELECT * INTO v FROM periods WHERE org_id = p_org AND period = v_start;

  IF v.status = 'open' THEN
    INSERT INTO task_assignments (org_id, process_id, project_id, period_id, title, due_date, status)
    SELECT p.org_id, p.id, p.project_id, v.id, p.name,
           CASE WHEN p.due_day IS NOT NULL THEN v_start + (LEAST(p.due_day, v_last) - 1) END,
           'pending'
    FROM processes p
    JOIN projects pr ON pr.id = p.project_id
    WHERE p.org_id = p_org AND p.active AND pr.active AND public.process_applies(p, v_start)
    ON CONFLICT (period_id, process_id) WHERE process_id IS NOT NULL DO NOTHING;

    UPDATE task_assignments t SET status = 'pending'
    FROM processes p JOIN projects pr ON pr.id = p.project_id
    WHERE t.period_id = v.id AND t.process_id = p.id AND t.status = 'cancelled'
      AND p.active AND pr.active AND public.process_applies(p, v_start);

    UPDATE task_assignments t SET status = 'cancelled'
    FROM processes p JOIN projects pr ON pr.id = p.project_id
    WHERE t.period_id = v.id AND t.process_id = p.id AND t.status = 'pending'
      AND NOT (p.active AND pr.active AND public.process_applies(p, v_start));

    UPDATE task_assignments t SET project_id = p.project_id
    FROM processes p
    WHERE t.period_id = v.id AND t.process_id = p.id AND t.project_id IS DISTINCT FROM p.project_id;
  END IF;

  RETURN v;
END;
$$;

-- Org chart
CREATE TABLE IF NOT EXISTS org_chart_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES org_chart_nodes(id) ON DELETE CASCADE,
  position TEXT NOT NULL CHECK (btrim(position) <> ''),
  person_name TEXT,
  area TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_org_chart_org ON org_chart_nodes (org_id);

ALTER TABLE org_chart_nodes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_chart_read ON org_chart_nodes;
CREATE POLICY org_chart_read ON org_chart_nodes FOR SELECT USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS org_chart_write ON org_chart_nodes;
CREATE POLICY org_chart_write ON org_chart_nodes FOR ALL
  USING (public.has_org_role(org_id, ARRAY['admin', 'manager']))
  WITH CHECK (public.has_org_role(org_id, ARRAY['admin', 'manager']));
