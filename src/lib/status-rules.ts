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

export const DAILY_LOG_STATUSES = [
  "draft",
  "submitted",
  "locked",
] as const;

export const PROJECT_EVENT_TYPES = [
  "project_created",
  "project_status_changed",
  "phase_created",
  "phase_status_changed",
  "assignment_created",
  "assignment_updated",
  "daily_log_submitted",
  "punch_item_created",
  "punch_item_status_changed",
  "change_order_created",
  "change_order_submitted",
  "change_order_approved",
  "change_order_rejected",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type PhaseStatus = (typeof PHASE_STATUSES)[number];
export type CrewAssignmentRole = (typeof CREW_ASSIGNMENT_ROLES)[number];
export type DailyLogStatus = (typeof DAILY_LOG_STATUSES)[number];
export type ProjectEventType = (typeof PROJECT_EVENT_TYPES)[number];
