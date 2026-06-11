import { useCreate, useGetIdentity, useGo, useList, useNotification } from "@refinedev/core";
import { useSearchParams } from "react-router";
import { useState, type ReactNode } from "react";

import { CreateView, CreateViewHeader } from "@/components/refine-ui/views/create-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignmentRoles } from "@/lib/schema";
import type {
  CrewAssignmentRecord,
  ProjectPhaseRecord,
  ProjectRecord,
  SessionUser,
  SiteUserRecord,
} from "@/types";

const today = new Date().toISOString().slice(0, 10);

export default function CrewAssignmentsCreatePage() {
  const [searchParams] = useSearchParams();
  const go = useGo();
  const { open } = useNotification();
  const { data: identity } = useGetIdentity<SessionUser>();
  const createAssignment = useCreate<CrewAssignmentRecord>();
  const isSubmitting = createAssignment.mutation.isPending;

  const initialProjectId = searchParams.get("projectId") ?? "";
  const [form, setForm] = useState({
    projectId: initialProjectId,
    phaseId: "project-wide",
    userId: "",
    assignedRole: "site_supervisor",
    startDate: today,
    endDate: "",
  });

  const { result: projectsResult } = useList<ProjectRecord>({
    resource: "projects",
    pagination: {
      currentPage: 1,
      pageSize: 100,
    },
  });
  const { result: phasesResult } = useList<ProjectPhaseRecord>({
    resource: "project-phases",
    filters: form.projectId
      ? [
          {
            field: "projectId",
            operator: "eq",
            value: form.projectId,
          },
        ]
      : [],
    pagination: {
      currentPage: 1,
      pageSize: 100,
    },
    queryOptions: {
      enabled: Boolean(form.projectId),
    },
  });
  const { result: usersResult } = useList<SiteUserRecord>({
    resource: "users",
    pagination: {
      currentPage: 1,
      pageSize: 100,
    },
  });

  const projects = projectsResult.data ?? [];
  const phases = phasesResult.data ?? [];
  const users = usersResult.data ?? [];

  const eligibleUsers = users.filter((record) => record.role === form.assignedRole);

  return (
    <CreateView>
      <CreateViewHeader resource="crew-assignments" title="Create crew assignment" />
      <Card>
        <CardHeader>
          <CardTitle>Assignment details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-5 md:grid-cols-2"
            onSubmit={async (event) => {
              event.preventDefault();

              try {
                await createAssignment.mutateAsync({
                  resource: "crew-assignments",
                  values: {
                    ...form,
                    phaseId: form.phaseId === "project-wide" ? null : form.phaseId,
                    endDate: form.endDate || null,
                  },
                });

                go({
                  to: "/projects/show/" + form.projectId,
                  type: "replace",
                });
              } catch (error) {
                open?.({
                  type: "error",
                  message: "Assignment creation failed",
                  description:
                    error instanceof Error
                      ? error.message
                      : "Unable to create crew assignment.",
                });
              }
            }}
          >
            <div className="md:col-span-2 rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              {identity?.role === "admin"
                ? "Admins can assign project managers, supervisors, and clients to any project."
                : "Project managers can assign crew only within projects they already manage."}
            </div>

            <Field label="Project">
              <Select
                value={form.projectId}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    projectId: value,
                    phaseId: "project-wide",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project: ProjectRecord) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.code} · {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Assignment role">
              <Select
                value={form.assignedRole}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    assignedRole: value,
                    userId: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignmentRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Assignee">
              <Select
                value={form.userId}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    userId: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleUsers.map((record: SiteUserRecord) => (
                    <SelectItem key={record.id} value={record.id}>
                      {record.name} · {record.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Phase scope">
              <Select
                value={form.phaseId}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    phaseId: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project-wide">Project-wide</SelectItem>
                  {phases.map((phase: ProjectPhaseRecord) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {phase.sequence}. {phase.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Start date">
              <Input
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
                required
              />
            </Field>

            <Field label="End date">
              <Input
                type="date"
                value={form.endDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    endDate: event.target.value,
                  }))
                }
              />
            </Field>

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create assignment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </CreateView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
