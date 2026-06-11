export const PROJECT_STATUSES = [
  "planning",
  "active",
  "at_risk",
  "on_hold",
  "completed",
] as const;

export const PHASE_STATUSES = [
  "not_started",
  "active",
  "blocked",
  "completed",
] as const;

export const CREW_ASSIGNMENT_ROLES = [
  "project_manager",
  "site_supervisor",
  "client",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type PhaseStatus = (typeof PHASE_STATUSES)[number];
export type CrewAssignmentRole = (typeof CREW_ASSIGNMENT_ROLES)[number];
