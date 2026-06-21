-- SitePulse demo domain seed
-- Use the fixed user IDs from demo-seed.json after creating the demo accounts.

insert into projects (
  id, code, name, client_name, location, contract_value, start_date, end_date, status, project_manager_id
) values
  (
    'project-north-yard',
    'SP-NORTH-001',
    'North Yard Logistics Hub',
    'Atlas Freight',
    'Pune',
    1250000,
    '2026-05-20T00:00:00Z',
    null,
    'active',
    'user-pm-001'
  ),
  (
    'project-riverfront',
    'SP-RIVER-002',
    'Riverfront Fit-Out',
    'Harbor Retail',
    'Mumbai',
    820000,
    '2026-05-01T00:00:00Z',
    null,
    'at_risk',
    'user-pm-001'
  )
on conflict (id) do nothing;

insert into project_phases (id, project_id, name, sequence, status) values
  ('phase-north-yard-01', 'project-north-yard', 'Civil Works', 1, 'active'),
  ('phase-north-yard-02', 'project-north-yard', 'Envelope', 2, 'not_started')
on conflict (id) do nothing;

insert into crew_assignments (
  id, project_id, phase_id, user_id, assigned_role, start_date, end_date
) values
  (
    'assignment-north-yard-pm',
    'project-north-yard',
    null,
    'user-pm-001',
    'project_manager',
    '2026-05-20T00:00:00Z',
    null
  ),
  (
    'assignment-north-yard-supervisor',
    'project-north-yard',
    'phase-north-yard-01',
    'user-supervisor-001',
    'site_supervisor',
    '2026-05-20T00:00:00Z',
    null
  ),
  (
    'assignment-north-yard-client',
    'project-north-yard',
    null,
    'user-client-001',
    'client',
    '2026-05-20T00:00:00Z',
    null
  )
on conflict (id) do nothing;

insert into daily_logs (
  id, project_id, phase_id, supervisor_id, log_date, workforce_count, weather,
  completed_work, blockers, safety_notes, status, submitted_at
) values
  (
    'daily-log-north-yard-2026-06-12',
    'project-north-yard',
    'phase-north-yard-01',
    'user-supervisor-001',
    '2026-06-12T00:00:00Z',
    18,
    'Clear',
    'Completed trench excavation and anchor bolt placement.',
    'Awaiting revised drainage sketch.',
    'Barricades inspected before shift handoff.',
    'submitted',
    '2026-06-12T18:00:00Z'
  )
on conflict (id) do nothing;

insert into punch_items (
  id, project_id, phase_id, title, description, severity, location, assignee_id,
  due_date, status, created_by
) values
  (
    'punch-north-yard-handrail',
    'project-north-yard',
    'phase-north-yard-01',
    'Missing handrail at dock stair',
    'Permanent handrail has not been installed at the west dock stair landing.',
    'high',
    'Dock stair landing',
    'user-supervisor-001',
    '2026-06-15T00:00:00Z',
    'ready_for_review',
    'user-pm-001'
  )
on conflict (id) do nothing;

insert into change_orders (
  id, project_id, phase_id, title, description, reason, requested_amount, requested_days,
  approved_amount, approved_days, status, created_by, submitted_by, reviewed_by,
  submitted_at, reviewed_at, review_notes
) values
  (
    'change-order-drainage',
    'project-north-yard',
    'phase-north-yard-01',
    'Additional drainage trench',
    'Add a trench drain along the revised loading dock apron edge.',
    'Stormwater ponding was discovered after demolition exposed the existing grade.',
    25000,
    4,
    22000,
    3,
    'approved',
    'user-pm-001',
    'user-pm-001',
    'user-admin-001',
    '2026-06-10T10:00:00Z',
    '2026-06-11T14:30:00Z',
    'Approved with reduced quantity based on revised trench length.'
  )
on conflict (id) do nothing;
