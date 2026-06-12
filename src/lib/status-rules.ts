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

export const PUNCH_ITEM_STATUSES = [
  "open",
  "in_progress",
  "ready_for_review",
  "closed",
] as const;

export const CHANGE_ORDER_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "rejected",
] as const;

export const PUNCH_ITEM_SEVERITIES = [
  "low",
  "medium",
  "high",
  "critical",
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
export type PunchItemStatus = (typeof PUNCH_ITEM_STATUSES)[number];
export type PunchItemSeverity = (typeof PUNCH_ITEM_SEVERITIES)[number];
export type ChangeOrderStatus = (typeof CHANGE_ORDER_STATUSES)[number];
export type ProjectEventType = (typeof PROJECT_EVENT_TYPES)[number];

const PUNCH_ITEM_STATUS_TRANSITIONS: Record<
  PunchItemStatus,
  readonly PunchItemStatus[]
> = {
  open: ["in_progress"],
  in_progress: ["ready_for_review"],
  ready_for_review: ["closed"],
  closed: [],
};

export const assertPunchItemTransition = (
  currentStatus: PunchItemStatus,
  nextStatus: PunchItemStatus,
) => {
  if (!PUNCH_ITEM_STATUS_TRANSITIONS[currentStatus].includes(nextStatus)) {
    throw new Error(
      `Invalid punch item transition from ${currentStatus} to ${nextStatus}.`,
    );
  }

  return nextStatus;
};

const CHANGE_ORDER_STATUS_TRANSITIONS: Record<
  ChangeOrderStatus,
  readonly ChangeOrderStatus[]
> = {
  draft: ["submitted"],
  submitted: ["approved", "rejected"],
  approved: [],
  rejected: [],
};

export const assertChangeOrderTransition = (
  currentStatus: ChangeOrderStatus,
  nextStatus: ChangeOrderStatus,
) => {
  if (!CHANGE_ORDER_STATUS_TRANSITIONS[currentStatus].includes(nextStatus)) {
    throw new Error(
      `Invalid change order transition from ${currentStatus} to ${nextStatus}.`,
    );
  }

  return nextStatus;
};
