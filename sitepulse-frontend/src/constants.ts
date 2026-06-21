import {
  BriefcaseBusiness,
  ClipboardList,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";

export const USER_ROLES = {
  ADMIN: "admin",
  PROJECT_MANAGER: "project_manager",
  SITE_SUPERVISOR: "site_supervisor",
  CLIENT: "client",
} as const;

const getEnvVar = (key: string, fallback?: string): string => {
  const env =
    (import.meta as ImportMeta & {
      env?: Record<string, string | undefined>;
    }).env ?? {};
  const value = env[key] ?? fallback;

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
};

export const BACKEND_BASE_URL = getEnvVar(
  "VITE_BACKEND_BASE_URL",
  "http://localhost:4000",
).replace(/\/+$/, "").replace(/\/api$/, "");
export const API_URL = `${BACKEND_BASE_URL}/api`;
export const AUTH_API_URL = `${API_URL}/auth`;

export const PUBLIC_ROLE_OPTIONS = [
  {
    value: USER_ROLES.CLIENT,
    label: "Client",
    icon: BriefcaseBusiness,
  },
] as const;

export const DASHBOARD_ROLE_COPY = {
  [USER_ROLES.ADMIN]: {
    title: "Admin Command",
    summary:
      "Manage staff identity, review operational access, and keep SitePulse tenant configuration under control.",
    icon: ShieldCheck,
  },
  [USER_ROLES.PROJECT_MANAGER]: {
    title: "Manager Workspace",
    summary:
      "Oversee assigned projects, review approvals, and coordinate the field workflow across active jobs.",
    icon: ClipboardList,
  },
  [USER_ROLES.SITE_SUPERVISOR]: {
    title: "Field Supervisor Board",
    summary:
      "Track site activity, complete daily operational tasks, and keep punch issues moving forward.",
    icon: LayoutDashboard,
  },
  [USER_ROLES.CLIENT]: {
    title: "Client Portal",
    summary:
      "Review approved project visibility, milestone status, and curated updates without internal staff detail.",
    icon: BriefcaseBusiness,
  },
} as const;
