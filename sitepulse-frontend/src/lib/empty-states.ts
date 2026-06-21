import { USER_ROLES } from "@/constants";
import type { SitePulseUserRole } from "@/types";

export const getDailyLogsEmptyState = (role?: SitePulseUserRole) =>
  role === USER_ROLES.SITE_SUPERVISOR
    ? "No field logs yet. Your next recurring action starts by saving today's site report."
    : role === USER_ROLES.PROJECT_MANAGER
      ? "No supervisor logs are visible yet. Once field teams submit their first reports, they will appear here."
      : "No daily logs are available yet.";

export const getPunchItemsEmptyState = (role?: SitePulseUserRole) =>
  role === USER_ROLES.PROJECT_MANAGER
    ? "No field issues are open yet. Overdue and open work will surface here as soon as crews start logging punch items."
    : role === USER_ROLES.SITE_SUPERVISOR
      ? "No punch items yet. Capture the first field issue here when something needs follow-up."
      : "No punch items are available yet.";

export const getChangeOrdersEmptyState = (role?: SitePulseUserRole) =>
  role === USER_ROLES.CLIENT
    ? "Approved change orders will appear here once your project team completes review."
    : role === USER_ROLES.PROJECT_MANAGER
      ? "No change orders are visible yet. Drafts and submitted requests will appear here for review."
      : "No change orders are available yet.";
