-- A process can apply to several projects; each month generates one task per (process, project)

CREATE TABLE IF NOT EXISTS process_projects (
  process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (process_id, project_id)
);
CREATE INDEX IF NOT EXISTS idx_process_projects_project ON process_projects (project_id);

ALTER TABLE process_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS process_projects_read ON process_projects;
CREATE POLICY process_projects_read ON process_projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM processes p WHERE p.id = process_projects.process_id AND public.is_org_member(p.org_id))
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'processes' AND column_name = 'project_id') THEN
    INSERT INTO process_projects (process_id, project_id)
    SELECT id, project_id FROM processes WHERE project_id IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

DROP TRIGGER IF EXISTS processes_project_org ON processes;
DROP INDEX IF EXISTS idx_processes_project;
ALTER TABLE processes DROP COLUMN IF EXISTS project_id;

DROP INDEX IF EXISTS uniq_task_period_process;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_task_period_process_project
  ON task_assignments (period_id, process_id, project_id) WHERE process_id IS NOT NULL;

-- Validates that every id is a project of the org and at least one was given
CREATE OR REPLACE FUNCTION public.assert_org_projects(p_org UUID, p_project_ids UUID[])
RETURNS VOID LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(array_length(p_project_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'El proceso debe pertenecer al menos a un proyecto';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(p_project_ids) AS x(id)
    WHERE NOT EXISTS (SELECT 1 FROM projects WHERE projects.id = x.id AND projects.org_id = p_org)
  ) THEN
    RAISE EXCEPTION 'Uno de los proyectos no pertenece a esta organización';
  END IF;
END;
$$;

-- Process, its projects and its steps are created in one transaction
CREATE OR REPLACE FUNCTION public.create_process(
  p_org UUID,
  p_name TEXT,
  p_description TEXT,
  p_color TEXT,
  p_recurrence TEXT,
  p_months SMALLINT[],
  p_once_period DATE,
  p_due_day SMALLINT,
  p_project_ids UUID[],
  p_steps JSONB
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.has_org_role(p_org, ARRAY['admin', 'manager']) THEN
    RAISE EXCEPTION 'No tienes permiso para crear procesos';
  END IF;
  PERFORM public.assert_org_projects(p_org, p_project_ids);

  INSERT INTO processes (org_id, name, description, color, created_by, recurrence, months, once_period, due_day)
  VALUES (p_org, p_name, p_description, p_color, auth.uid(), p_recurrence, COALESCE(p_months, '{}'), p_once_period, p_due_day)
  RETURNING id INTO v_id;

  INSERT INTO process_projects (process_id, project_id)
  SELECT v_id, x FROM (SELECT DISTINCT unnest(p_project_ids) AS x) s;

  INSERT INTO steps (process_id, title, description, "order", duration_days)
  SELECT v_id, s->>'title', NULLIF(s->>'description', ''), ord::int, NULLIF(s->>'duration_days', '')::int
  FROM jsonb_array_elements(COALESCE(p_steps, '[]'::jsonb)) WITH ORDINALITY AS t(s, ord)
  WHERE btrim(COALESCE(s->>'title', '')) <> '';

  RETURN v_id;
END;
$$;

-- Checked projects become active links; unchecked ones are disabled (history is kept)
CREATE OR REPLACE FUNCTION public.set_process_projects(p_process UUID, p_project_ids UUID[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org UUID;
BEGIN
  SELECT org_id INTO v_org FROM processes WHERE id = p_process;
  IF v_org IS NULL OR NOT public.has_org_role(v_org, ARRAY['admin', 'manager']) THEN
    RAISE EXCEPTION 'No tienes permiso para modificar este proceso';
  END IF;
  PERFORM public.assert_org_projects(v_org, p_project_ids);

  INSERT INTO process_projects (process_id, project_id)
  SELECT p_process, x FROM (SELECT DISTINCT unnest(p_project_ids) AS x) s
  ON CONFLICT (process_id, project_id) DO NOTHING;

  UPDATE process_projects SET active = (project_id = ANY(p_project_ids))
  WHERE process_id = p_process;
END;
$$;

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
    SELECT p.org_id, p.id, pp.project_id, v.id, p.name,
           CASE WHEN p.due_day IS NOT NULL THEN v_start + (LEAST(p.due_day, v_last) - 1) END,
           'pending'
    FROM processes p
    JOIN process_projects pp ON pp.process_id = p.id
    JOIN projects pr ON pr.id = pp.project_id
    WHERE p.org_id = p_org AND p.active AND pp.active AND pr.active AND public.process_applies(p, v_start)
    ON CONFLICT (period_id, process_id, project_id) WHERE process_id IS NOT NULL DO NOTHING;

    UPDATE task_assignments t SET status = 'pending'
    FROM processes p
    JOIN process_projects pp ON pp.process_id = p.id
    JOIN projects pr ON pr.id = pp.project_id
    WHERE t.period_id = v.id AND t.process_id = p.id AND t.project_id = pp.project_id
      AND t.status = 'cancelled'
      AND p.active AND pp.active AND pr.active AND public.process_applies(p, v_start);

    UPDATE task_assignments t SET status = 'cancelled'
    WHERE t.period_id = v.id AND t.process_id IS NOT NULL AND t.status = 'pending'
      AND NOT EXISTS (
        SELECT 1 FROM processes p
        JOIN process_projects pp ON pp.process_id = p.id
        JOIN projects pr ON pr.id = pp.project_id
        WHERE p.id = t.process_id AND pp.project_id = t.project_id
          AND p.active AND pp.active AND pr.active AND public.process_applies(p, v_start)
      );
  END IF;

  RETURN v;
END;
$$;
