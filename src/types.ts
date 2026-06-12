import type { USER_ROLES } from "./constants";
import type {
  CrewAssignmentRecord,
  ChangeOrderRecord,
  DailyLogRecord,
  PunchItemRecord,
  ProjectPhaseRecord,
  ProjectRecord,
  SiteUserRecord,
} from "./lib/schema";

export type SitePulseUserRole =
  (typeof USER_ROLES)[keyof typeof USER_ROLES];

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: SitePulseUserRole;
  image?: string;
};

export type SignUpPayload = {
  email: string;
  name: string;
  password: string;
  role: SitePulseUserRole;
};

export type {
  CrewAssignmentRecord,
  ChangeOrderRecord,
  DailyLogRecord,
  PunchItemRecord,
  ProjectPhaseRecord,
  ProjectRecord,
  SiteUserRecord,
};
