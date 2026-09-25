-- One-off tasks can have their own steps, each with a due date

ALTER TABLE steps
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES task_assignments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS due_date DATE;

ALTER TABLE steps DROP CONSTRAINT IF EXISTS steps_owner_check;
ALTER TABLE steps ADD CONSTRAINT steps_owner_check CHECK ((process_id IS NULL) <> (task_id IS NULL));
CREATE INDEX IF NOT EXISTS idx_steps_task ON steps (task_id);

DROP POLICY IF EXISTS steps_task_read ON steps;
CREATE POLICY steps_task_read ON steps FOR SELECT USING (
  EXISTS (SELECT 1 FROM task_assignments t WHERE t.id = steps.task_id AND public.is_org_member(t.org_id))
);

-- Completion now counts the task's own steps as well as its process steps
CREATE OR REPLACE FUNCTION public.sync_task_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_task UUID;
  v_total INT;
  v_done INT;
BEGIN
  IF TG_OP = 'DELETE' THEN v_task := OLD.task_id; ELSE v_task := NEW.task_id; END IF;

  SELECT COUNT(*) INTO v_total
  FROM steps s JOIN task_assignments t ON t.id = v_task
  WHERE s.process_id = t.process_id OR s.task_id = t.id;
  SELECT COUNT(*) INTO v_done FROM step_progress WHERE task_id = v_task AND completed;

  UPDATE task_assignments SET
    status = CASE WHEN v_total > 0 AND v_done >= v_total THEN 'completed' ELSE 'pending' END,
    completed_at = CASE WHEN v_total > 0 AND v_done >= v_total THEN NOW() END
  WHERE id = v_task AND status <> 'cancelled';
  RETURN NULL;
END;
$$;

-- One-off task with its steps, created atomically
CREATE OR REPLACE FUNCTION public.create_task(
  p_org UUID,
  p_period DATE,
  p_project UUID,
  p_title TEXT,
  p_description TEXT,
  p_assigned_to UUID,
  p_due_date DATE,
  p_steps JSONB
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v periods;
  v_id UUID;
  v_due DATE;
BEGIN
  IF NOT public.has_org_role(p_org, ARRAY['admin', 'manager']) THEN
    RAISE EXCEPTION 'No tienes permiso para crear tareas';
  END IF;
  IF btrim(COALESCE(p_title, '')) = '' THEN
    RAISE EXCEPTION 'La tarea necesita un título';
  END IF;
  PERFORM public.assert_org_projects(p_org, ARRAY[p_project]);
  IF p_assigned_to IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM organization_members WHERE org_id = p_org AND user_id = p_assigned_to
  ) THEN
    RAISE EXCEPTION 'La persona asignada no pertenece a tu equipo';
  END IF;

  v := public.ensure_period(p_org, p_period);
  IF v.status = 'closed' THEN
    RAISE EXCEPTION 'Este mes ya está cerrado';
  END IF;

  SELECT MAX(NULLIF(s->>'due_date', '')::date) INTO v_due
  FROM jsonb_array_elements(COALESCE(p_steps, '[]'::jsonb)) s;

  INSERT INTO task_assignments (org_id, project_id, period_id, assigned_to, assigned_by, title, description, due_date)
  VALUES (p_org, p_project, v.id, p_assigned_to, auth.uid(), btrim(p_title), NULLIF(p_description, ''), COALESCE(p_due_date, v_due))
  RETURNING id INTO v_id;

  INSERT INTO steps (task_id, title, description, "order", due_date)
  SELECT v_id, btrim(s->>'title'), NULLIF(s->>'description', ''), ord::int, NULLIF(s->>'due_date', '')::date
  FROM jsonb_array_elements(COALESCE(p_steps, '[]'::jsonb)) WITH ORDINALITY AS t(s, ord)
  WHERE btrim(COALESCE(s->>'title', '')) <> '';

  RETURN v_id;
END;
$$;
