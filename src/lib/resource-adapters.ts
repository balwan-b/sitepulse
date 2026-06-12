import type { IResourceItem } from "@refinedev/core";
import { createElement } from "react";
import {
  CircleAlert,
  BriefcaseBusiness,
  ClipboardList,
  FileCheck2,
  FolderKanban,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";

import { USER_ROLES } from "@/constants";

export const sitePulseResources: IResourceItem[] = [
  {
    name: "dashboard",
    list: "/",
    meta: {
      label: "Dashboard",
      icon: createElement(LayoutDashboard),
      roles: [
        USER_ROLES.ADMIN,
        USER_ROLES.PROJECT_MANAGER,
        USER_ROLES.SITE_SUPERVISOR,
        USER_ROLES.CLIENT,
      ],
    },
  },
  {
    name: "projects",
    list: "/projects",
    show: "/projects/show/:id",
    create: "/projects/create",
    meta: {
      label: "Projects",
      icon: createElement(FolderKanban),
      roles: [
        USER_ROLES.ADMIN,
        USER_ROLES.PROJECT_MANAGER,
        USER_ROLES.SITE_SUPERVISOR,
        USER_ROLES.CLIENT,
      ],
    },
  },
  {
    name: "project-phases",
    list: "/project-phases",
    show: "/project-phases/show/:id",
    create: "/project-phases/create",
    meta: {
      label: "Project Phases",
      icon: createElement(ClipboardList),
      roles: [
        USER_ROLES.ADMIN,
        USER_ROLES.PROJECT_MANAGER,
        USER_ROLES.SITE_SUPERVISOR,
        USER_ROLES.CLIENT,
      ],
    },
  },
  {
    name: "crew-assignments",
    create: "/crew-assignments/create",
    meta: {
      label: "Crew Assignments",
      icon: createElement(Users),
      roles: [USER_ROLES.ADMIN, USER_ROLES.PROJECT_MANAGER],
    },
  },
  {
    name: "daily-logs",
    list: "/daily-logs",
    show: "/daily-logs/show/:id",
    create: "/daily-logs/create",
    meta: {
      label: "Daily Logs",
      icon: createElement(ClipboardList),
      roles: [
        USER_ROLES.ADMIN,
        USER_ROLES.PROJECT_MANAGER,
        USER_ROLES.SITE_SUPERVISOR,
      ],
    },
  },
  {
    name: "punch-items",
    list: "/punch-items",
    show: "/punch-items/show/:id",
    create: "/punch-items/create",
    meta: {
      label: "Punch Items",
      icon: createElement(CircleAlert),
      roles: [
        USER_ROLES.ADMIN,
        USER_ROLES.PROJECT_MANAGER,
        USER_ROLES.SITE_SUPERVISOR,
      ],
    },
  },
  {
    name: "change-orders",
    list: "/change-orders",
    show: "/change-orders/show/:id",
    create: "/change-orders/create",
    meta: {
      label: "Change Orders",
      icon: createElement(FileCheck2),
      roles: [
        USER_ROLES.ADMIN,
        USER_ROLES.PROJECT_MANAGER,
        USER_ROLES.SITE_SUPERVISOR,
        USER_ROLES.CLIENT,
      ],
    },
  },
  {
    name: "users",
    list: "/staff",
    meta: {
      label: "Staff Directory",
      icon: createElement(ShieldCheck),
      roles: [USER_ROLES.ADMIN, USER_ROLES.PROJECT_MANAGER],
    },
  },
  {
    name: "client-portal",
    list: "/client-portal",
    meta: {
      label: "Client Portal",
      icon: createElement(BriefcaseBusiness),
      roles: [USER_ROLES.ADMIN, USER_ROLES.CLIENT],
    },
  },
];
