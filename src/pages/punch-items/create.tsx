import { useCreate, useGetIdentity, useGo, useList, useNotification } from "@refinedev/core";
import { useSearchParams } from "react-router";
import { useState, type ReactNode } from "react";

import { USER_ROLES } from "@/constants";
import { CreateView, CreateViewHeader } from "@/components/refine-ui/views/create-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { punchItemSeverities } from "@/lib/schema";
import type {
  ProjectPhaseRecord,
  ProjectRecord,
  PunchItemRecord,
  SessionUser,
  SiteUserRecord,
} from "@/types";

const today = new Date();
const defaultDueDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

type FormState = {
  projectId: string;
  phaseId: string;
  title: string;
  description: string;
  severity: PunchItemRecord["severity"];
  location: string;
  assigneeId: string;
  dueDate: string;
};

const initialForm = (projectId: string): FormState => ({
  projectId,
  phaseId: "",
  title: "",
  description: "",
  severity: "medium",
  location: "",
  assigneeId: "",
  dueDate: defaultDueDate,
});

export default function PunchItemsCreatePage() {
  const [searchParams] = useSearchParams();
  const { data: identity } = useGetIdentity<SessionUser>();
  const go = useGo();
  const { open } = useNotification();
  const createPunchItem = useCreate<PunchItemRecord>();
  const initialProjectId = searchParams.get("projectId") ?? "";
  const [form, setForm] = useState<FormState>(initialForm(initialProjectId));

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

  const canAssign = identity?.role === USER_ROLES.ADMIN || identity?.role === USER_ROLES.PROJECT_MANAGER;
  const { result: usersResult } = useList<SiteUserRecord>({
    resource: "users",
    pagination: {
      currentPage: 1,
      pageSize: 100,
    },
    queryOptions: {
      enabled: canAssign,
    },
  });

  const projects = projectsResult.data ?? [];
  const phases = phasesResult.data ?? [];
  const assignees = (usersResult.data ?? []).filter(
    (record) =>
      record.role === USER_ROLES.PROJECT_MANAGER ||
      record.role === USER_ROLES.SITE_SUPERVISOR,
  );

  return (
    <CreateView>
      <CreateViewHeader resource="punch-items" title="Create punch item" />
      <Card>
        <CardHeader>
          <CardTitle>Field issue capture</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length ? (
            <form
              className="grid gap-5 md:grid-cols-2"
              onSubmit={async (event) => {
                event.preventDefault();

                try {
                  const response = await createPunchItem.mutateAsync({
                    resource: "punch-items",
                    values: {
                      projectId: form.projectId,
                      phaseId: form.phaseId || null,
                      title: form.title,
                      description: form.description,
                      severity: form.severity,
                      location: form.location,
                      assigneeId: canAssign ? form.assigneeId || null : null,
                      dueDate: form.dueDate,
                      status: "open",
                    },
                  });

                  go({
                    to: {
                      resource: "punch-items",
                      action: "show",
                      id: response.data.id,
                    },
                    type: "replace",
                  });
                } catch (error) {
                  open?.({
                    type: "error",
                    message: "Punch item creation failed",
                    description:
                      error instanceof Error
                        ? error.message
                        : "Unable to create this punch item.",
                  });
                }
              }}
            >
              <Field label="Project">
                <Select
                  value={form.projectId}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      projectId: value,
                      phaseId: "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.code} · {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Phase">
                <Select
                  value={form.phaseId || "none"}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      phaseId: value === "none" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional phase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Project-wide issue</SelectItem>
                    {phases.map((phase) => (
                      <SelectItem key={phase.id} value={phase.id}>
                        {phase.sequence}. {phase.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="md:col-span-2">
                <Field label="Title">
                  <Input
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Missing handrail at west stair landing"
                    required
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Description">
                  <Textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    className="min-h-28"
                    required
                  />
                </Field>
              </div>

              <Field label="Severity">
                <Select
                  value={form.severity}
                  onValueChange={(value: PunchItemRecord["severity"]) =>
                    setForm((current) => ({
                      ...current,
                      severity: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {punchItemSeverities.map((severity) => (
                      <SelectItem key={severity} value={severity}>
                        {severity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Due date">
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      dueDate: event.target.value,
                    }))
                  }
                  required
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Location">
                  <Input
                    value={form.location}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        location: event.target.value,
                      }))
                    }
                    placeholder="Level 3, west stair core"
                    required
                  />
                </Field>
              </div>

              {canAssign ? (
                <div className="md:col-span-2">
                  <Field label="Assignee">
                    <Select
                      value={form.assigneeId || "unassigned"}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          assigneeId: value === "unassigned" ? "" : value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {assignees.map((assignee) => (
                          <SelectItem key={assignee.id} value={assignee.id}>
                            {assignee.name} · {assignee.role.replaceAll("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              ) : null}

              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={createPunchItem.mutation.isPending}>
                  {createPunchItem.mutation.isPending ? "Creating..." : "Create punch item"}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              You need an assigned project before you can capture a field issue.
            </p>
          )}
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
