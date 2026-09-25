-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  slug VARCHAR UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  plan VARCHAR DEFAULT 'free',
  max_users INTEGER DEFAULT 3,
  max_processes INTEGER DEFAULT 5,
  stripe_customer_id VARCHAR
);

-- Organization members
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR DEFAULT 'worker',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- Processes
CREATE TABLE processes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  color VARCHAR DEFAULT '#1F6F63',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Steps
CREATE TABLE steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_id UUID REFERENCES processes(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  "order" INTEGER,
  duration_days INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Task assignments
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  process_id UUID REFERENCES processes(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id),
  assigned_by UUID REFERENCES auth.users(id),
  title VARCHAR NOT NULL,
  description TEXT,
  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step progress
CREATE TABLE step_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES task_assignments(id) ON DELETE CASCADE,
  step_id UUID REFERENCES steps(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(task_id, step_id)
);

-- Indexes for performance
CREATE INDEX idx_org_members_org_id ON organization_members(org_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_processes_org_id ON processes(org_id);
CREATE INDEX idx_steps_process_id ON steps(process_id);
CREATE INDEX idx_tasks_org_id ON task_assignments(org_id);
CREATE INDEX idx_tasks_assigned_to ON task_assignments(assigned_to);
CREATE INDEX idx_step_progress_task_id ON step_progress(task_id);

-- RLS Policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_progress ENABLE ROW LEVEL SECURITY;

-- Organization policies
CREATE POLICY org_read ON organizations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.org_id = organizations.id
    AND organization_members.user_id = auth.uid()
  )
);

CREATE POLICY org_update ON organizations FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.org_id = organizations.id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role = 'admin'
  )
);

-- Organization members policies
CREATE POLICY members_read ON organization_members FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM organization_members om2
    WHERE om2.org_id = organization_members.org_id
    AND om2.user_id = auth.uid()
  )
);

-- Processes policies
CREATE POLICY processes_read ON processes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.org_id = processes.org_id
    AND organization_members.user_id = auth.uid()
  )
);

CREATE POLICY processes_create ON processes FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.org_id = processes.org_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role IN ('admin', 'manager')
  )
);

-- Steps policies
CREATE POLICY steps_read ON steps FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM processes p
    INNER JOIN organization_members om ON p.org_id = om.org_id
    WHERE steps.process_id = p.id
    AND om.user_id = auth.uid()
  )
);

-- Task assignments policies
CREATE POLICY tasks_read ON task_assignments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.org_id = task_assignments.org_id
    AND organization_members.user_id = auth.uid()
  )
);

CREATE POLICY tasks_create ON task_assignments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.org_id = task_assignments.org_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role IN ('admin', 'manager')
  )
);

CREATE POLICY tasks_update ON task_assignments FOR UPDATE USING (
  assigned_to = auth.uid() OR
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.org_id = task_assignments.org_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role IN ('admin', 'manager')
  )
);

-- Step progress policies
CREATE POLICY progress_read ON step_progress FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM task_assignments ta
    INNER JOIN organization_members om ON ta.org_id = om.org_id
    WHERE step_progress.task_id = ta.id
    AND om.user_id = auth.uid()
  )
);

CREATE POLICY progress_update ON step_progress FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM task_assignments ta
    WHERE step_progress.task_id = ta.id
    AND (ta.assigned_to = auth.uid() OR
         EXISTS (
           SELECT 1 FROM organization_members
           WHERE organization_members.org_id = ta.org_id
           AND organization_members.user_id = auth.uid()
           AND organization_members.role IN ('admin', 'manager')
         ))
  )
);
