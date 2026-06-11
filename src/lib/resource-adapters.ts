import type { IResourceItem } from "@refinedev/core";
import { createElement } from "react";
import {
  BriefcaseBusiness,
  ClipboardList,
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
