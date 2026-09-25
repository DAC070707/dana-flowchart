-- Monthly periods, recurring processes, enable/disable and month closing

CREATE OR REPLACE FUNCTION public.has_org_role(p_org UUID, p_roles TEXT[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = p_org AND user_id = auth.uid() AND role = ANY(p_roles)
  );
$$;

-- Processes: recurrence + active flag
ALTER TABLE processes
  ADD COLUMN IF NOT EXISTS recurrence TEXT NOT NULL DEFAULT 'monthly'
    CHECK (recurrence IN ('monthly', 'months', 'once')),
  ADD COLUMN IF NOT EXISTS months SMALLINT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS once_period DATE,
  ADD COLUMN IF NOT EXISTS due_day SMALLINT CHECK (due_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

-- Periods (one row per org per month)
CREATE TABLE IF NOT EXISTS periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period DATE NOT NULL CHECK (EXTRACT(DAY FROM period) = 1),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, period)
);
ALTER TABLE periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS periods_read ON periods;
CREATE POLICY periods_read ON periods FOR SELECT USING (public.is_org_member(org_id));

-- Tasks belong to a period; status replaces the old completed flag
ALTER TABLE task_assignments
  ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES periods(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE task_assignments DROP COLUMN IF EXISTS completed;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_task_period_process
  ON task_assignments (period_id, process_id) WHERE process_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_period ON task_assignments (period_id);

CREATE OR REPLACE FUNCTION public.process_applies(p processes, p_period DATE)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT CASE p.recurrence
    WHEN 'once' THEN p.once_period = p_period
    WHEN 'months' THEN EXTRACT(MONTH FROM p_period)::SMALLINT = ANY(p.months)
                       AND p_period >= date_trunc('month', p.created_at)::date
    ELSE p_period >= date_trunc('month', p.created_at)::date
  END;
$$;

-- Creates the period if missing and, while open, syncs its tasks with the process configuration
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
    INSERT INTO task_assignments (org_id, process_id, period_id, title, due_date, status)
    SELECT p.org_id, p.id, v.id, p.name,
           CASE WHEN p.due_day IS NOT NULL THEN v_start + (LEAST(p.due_day, v_last) - 1) END,
           'pending'
    FROM processes p
    WHERE p.org_id = p_org AND p.active AND public.process_applies(p, v_start)
    ON CONFLICT (period_id, process_id) WHERE process_id IS NOT NULL DO NOTHING;

    UPDATE task_assignments t SET status = 'pending'
    FROM processes p
    WHERE t.period_id = v.id AND t.process_id = p.id AND t.status = 'cancelled'
      AND p.active AND public.process_applies(p, v_start);

    UPDATE task_assignments t SET status = 'cancelled'
    FROM processes p
    WHERE t.period_id = v.id AND t.process_id = p.id AND t.status = 'pending'
      AND NOT (p.active AND public.process_applies(p, v_start));
  END IF;

  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_period(p_period_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v periods;
  v_pending INT;
BEGIN
  SELECT * INTO v FROM periods WHERE id = p_period_id;
  IF v.id IS NULL OR NOT public.has_org_role(v.org_id, ARRAY['admin', 'manager']) THEN
    RAISE EXCEPTION 'No tienes permiso para cerrar este mes';
  END IF;
  IF v.status = 'closed' THEN
    RAISE EXCEPTION 'El mes ya está cerrado';
  END IF;

  PERFORM public.ensure_period(v.org_id, v.period);

  SELECT COUNT(*) INTO v_pending FROM task_assignments
  WHERE period_id = p_period_id AND status = 'pending';
  IF v_pending > 0 THEN
    RAISE EXCEPTION 'No se puede cerrar el mes: hay % tarea(s) sin completar', v_pending;
  END IF;

  UPDATE periods SET status = 'closed', closed_at = NOW(), closed_by = auth.uid()
  WHERE id = p_period_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_period(p_period_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org UUID;
BEGIN
  SELECT org_id INTO v_org FROM periods WHERE id = p_period_id;
  IF v_org IS NULL OR NOT public.has_org_role(v_org, ARRAY['admin']) THEN
    RAISE EXCEPTION 'Solo un administrador puede reabrir el mes';
  END IF;
  UPDATE periods SET status = 'open', closed_at = NULL, closed_by = NULL WHERE id = p_period_id;
END;
$$;

-- Nothing inside a closed month can change
CREATE OR REPLACE FUNCTION public.guard_closed_period()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
  v_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;

  IF TG_TABLE_NAME = 'task_assignments' THEN
    SELECT status INTO v_status FROM periods WHERE id = r.period_id;
  ELSE
    SELECT pe.status INTO v_status
    FROM task_assignments t JOIN periods pe ON pe.id = t.period_id
    WHERE t.id = r.task_id;
  END IF;

  IF v_status = 'closed' THEN
    RAISE EXCEPTION 'El mes está cerrado; no se puede modificar';
  END IF;
  RETURN r;
END;
$$;

DROP TRIGGER IF EXISTS guard_tasks_closed ON task_assignments;
CREATE TRIGGER guard_tasks_closed BEFORE INSERT OR UPDATE OR DELETE ON task_assignments
  FOR EACH ROW EXECUTE FUNCTION public.guard_closed_period();

DROP TRIGGER IF EXISTS guard_progress_closed ON step_progress;
CREATE TRIGGER guard_progress_closed BEFORE INSERT OR UPDATE OR DELETE ON step_progress
  FOR EACH ROW EXECUTE FUNCTION public.guard_closed_period();

-- A task with steps is completed exactly when all its steps are done
CREATE OR REPLACE FUNCTION public.sync_task_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_task UUID;
  v_total INT;
  v_done INT;
BEGIN
  IF TG_OP = 'DELETE' THEN v_task := OLD.task_id; ELSE v_task := NEW.task_id; END IF;

  SELECT COUNT(*) INTO v_total
  FROM steps s JOIN task_assignments t ON t.process_id = s.process_id
  WHERE t.id = v_task;
  SELECT COUNT(*) INTO v_done FROM step_progress WHERE task_id = v_task AND completed;

  UPDATE task_assignments SET
    status = CASE WHEN v_total > 0 AND v_done >= v_total THEN 'completed' ELSE 'pending' END,
    completed_at = CASE WHEN v_total > 0 AND v_done >= v_total THEN NOW() END
  WHERE id = v_task AND status <> 'cancelled';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS step_progress_sync ON step_progress;
CREATE TRIGGER step_progress_sync AFTER INSERT OR UPDATE OR DELETE ON step_progress
  FOR EACH ROW EXECUTE FUNCTION public.sync_task_status();

-- Team list with emails (auth.users is not exposed through the API)
CREATE OR REPLACE FUNCTION public.org_members(p_org UUID)
RETURNS TABLE (user_id UUID, email TEXT, name TEXT, role TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.user_id,
         u.email::text,
         COALESCE(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', u.email)::text,
         m.role::text
  FROM organization_members m
  JOIN auth.users u ON u.id = m.user_id
  WHERE m.org_id = p_org AND public.is_org_member(p_org);
$$;

-- Missing write policies
DROP POLICY IF EXISTS processes_update ON processes;
CREATE POLICY processes_update ON processes FOR UPDATE
  USING (public.has_org_role(org_id, ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS steps_write ON steps;
CREATE POLICY steps_write ON steps FOR ALL
  USING (EXISTS (SELECT 1 FROM processes p WHERE p.id = steps.process_id
                 AND public.has_org_role(p.org_id, ARRAY['admin', 'manager'])))
  WITH CHECK (EXISTS (SELECT 1 FROM processes p WHERE p.id = steps.process_id
                      AND public.has_org_role(p.org_id, ARRAY['admin', 'manager'])));

DROP POLICY IF EXISTS tasks_delete ON task_assignments;
CREATE POLICY tasks_delete ON task_assignments FOR DELETE
  USING (public.has_org_role(org_id, ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS progress_insert ON step_progress;
CREATE POLICY progress_insert ON step_progress FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM task_assignments ta WHERE ta.id = step_progress.task_id
          AND (ta.assigned_to = auth.uid() OR public.has_org_role(ta.org_id, ARRAY['admin', 'manager'])))
);
