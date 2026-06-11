import { USER_ROLES } from "@/constants";
import type { SitePulseUserRole } from "@/types";

export const isPublicRegistrationRoleAllowed = (role: SitePulseUserRole) =>
  role === USER_ROLES.CLIENT;
