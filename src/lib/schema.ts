import { z } from "zod";

export const projectStatuses = [
  "planning",
  "active",
  "at_risk",
  "on_hold",
  "completed",
] as const;

export const phaseStatuses = [
  "not_started",
  "active",
  "blocked",
  "completed",
] as const;

export const assignmentRoles = [
  "project_manager",
  "site_supervisor",
  "client",
] as const;

export const projectSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  clientName: z.string(),
  location: z.string(),
  contractValue: z.number(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  status: z.enum(projectStatuses),
  projectManagerId: z.string().nullable(),
  projectManagerName: z.string().nullable().optional(),
  projectManagerEmail: z.string().nullable().optional(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const projectPhaseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  projectCode: z.string().nullable().optional(),
  projectName: z.string().nullable().optional(),
  name: z.string(),
  sequence: z.number(),
  status: z.enum(phaseStatuses),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const crewAssignmentSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  projectCode: z.string().nullable().optional(),
  projectName: z.string().nullable().optional(),
  phaseId: z.string().nullable(),
  phaseName: z.string().nullable().optional(),
  userId: z.string(),
  userName: z.string().nullable().optional(),
  userEmail: z.string().nullable().optional(),
  userRole: z.string().nullable().optional(),
  assignedRole: z.enum(assignmentRoles),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const siteUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.string(),
  image: z.string().nullable().optional(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export type ProjectRecord = z.infer<typeof projectSchema>;
export type ProjectPhaseRecord = z.infer<typeof projectPhaseSchema>;
export type CrewAssignmentRecord = z.infer<typeof crewAssignmentSchema>;
export type SiteUserRecord = z.infer<typeof siteUserSchema>;
