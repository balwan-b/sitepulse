import { useCreate, useGetIdentity, useGo, useList, useNotification } from "@refinedev/core";
import { useSearchParams } from "react-router";
import { useState, type ReactNode } from "react";

import { CreateView, CreateViewHeader } from "@/components/refine-ui/views/create-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { submitDailyLogRequest } from "@/lib/daily-logs";
import { USER_ROLES } from "@/constants";
import type {
  DailyLogRecord,
  ProjectPhaseRecord,
  ProjectRecord,
  SessionUser,
  SiteUserRecord,
} from "@/types";

const today = new Date().toISOString().slice(0, 10);

type FormState = {
  projectId: string;
  phaseId: string;
  logDate: string;
  workforceCount: string;
  weather: string;
  completedWork: string;
  blockers: string;
  safetyNotes: string;
  supervisorId: string;
};

const initialForm = (projectId: string): FormState => ({
  projectId,
  phaseId: "",
  logDate: today,
  workforceCount: "0",
  weather: "",
  completedWork: "",
  blockers: "",
  safetyNotes: "",
  supervisorId: "",
});

export default function DailyLogsCreatePage() {
  const [searchParams] = useSearchParams();
  const { data: identity } = useGetIdentity<SessionUser>();
  const go = useGo();
  const { open } = useNotification();
  const createDailyLog = useCreate<DailyLogRecord>();
  const isSubmitting = createDailyLog.mutation.isPending;
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

  const { result: supervisorsResult } = useList<SiteUserRecord>({
    resource: "users",
    filters: [
      {
        field: "role",
        operator: "eq",
        value: USER_ROLES.SITE_SUPERVISOR,
      },
    ],
    pagination: {
      currentPage: 1,
      pageSize: 100,
    },
    queryOptions: {
      enabled: identity?.role === USER_ROLES.ADMIN,
    },
  });

  const projects = projectsResult.data ?? [];
  const phases = phasesResult.data ?? [];
  const supervisors = supervisorsResult.data ?? [];
  const hasProjects = projects.length > 0;
  const requiresSupervisorSelection = identity?.role === USER_ROLES.ADMIN;

  const buildPayload = () => ({
    projectId: form.projectId,
    phaseId: form.phaseId || null,
    logDate: form.logDate,
    workforceCount: Number(form.workforceCount),
    weather: form.weather,
    completedWork: form.completedWork,
    blockers: form.blockers || null,
    safetyNotes: form.safetyNotes || null,
    status: "draft",
    supervisorId: requiresSupervisorSelection ? form.supervisorId || null : undefined,
  });

  const handleCreate = async (mode: "draft" | "submit") => {
    if (requiresSupervisorSelection && !form.supervisorId) {
      open?.({
        type: "error",
        message: "Supervisor required",
        description: "Select the supervisor who owns this daily log before saving it.",
      });
      return;
    }

    try {
      const response = await createDailyLog.mutateAsync({
        resource: "daily-logs",
        values: buildPayload(),
      });

      if (mode === "submit") {
        try {
          const submitted = await submitDailyLogRequest(response.data.id);
          open?.({
            type: "success",
            message: "Daily log submitted",
            description: "The field log is now locked in as a submitted entry.",
          });
          go({
            to: {
              resource: "daily-logs",
              action: "show",
              id: submitted.id,
            },
            type: "replace",
          });
          return;
        } catch (error) {
          open?.({
            type: "error",
            message: "Draft saved but submission failed",
            description:
              error instanceof Error
                ? error.message
                : "The draft was created, but it could not be submitted.",
          });
        }
      }

      go({
        to: {
          resource: "daily-logs",
          action: "show",
          id: response.data.id,
        },
        type: "replace",
      });
    } catch (error) {
      open?.({
        type: "error",
        message: mode === "submit" ? "Daily log submission failed" : "Draft save failed",
        description:
          error instanceof Error ? error.message : "Unable to save this daily log.",
      });
    }
  };

  return (
    <CreateView>
      <CreateViewHeader resource="daily-logs" title="Create daily log" />
      <Card>
        <CardHeader>
          <CardTitle>Field report</CardTitle>
        </CardHeader>
        <CardContent>
          {hasProjects ? (
            <form
              className="grid gap-5 md:grid-cols-2"
              onSubmit={async (event) => {
                event.preventDefault();
                await handleCreate("draft");
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
                    {projects.map((project: ProjectRecord) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.code} · {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Log date">
                <Input
                  type="date"
                  value={form.logDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      logDate: event.target.value,
                    }))
                  }
                  required
                />
              </Field>

              {requiresSupervisorSelection ? (
                <Field label="Supervisor">
                  <Select
                    value={form.supervisorId}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        supervisorId: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      {supervisors.map((supervisor: SiteUserRecord) => (
                        <SelectItem key={supervisor.id} value={supervisor.id}>
                          {supervisor.name} · {supervisor.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}

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
                    <SelectItem value="none">Project-wide log</SelectItem>
                    {phases.map((phase: ProjectPhaseRecord) => (
                      <SelectItem key={phase.id} value={phase.id}>
                        {phase.sequence}. {phase.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Workforce count">
                <Input
                  type="number"
                  min="0"
                  value={form.workforceCount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      workforceCount: event.target.value,
                    }))
                  }
                  required
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Weather">
                  <Input
                    value={form.weather}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        weather: event.target.value,
                      }))
                    }
                    placeholder="Clear, humid, mild winds"
                    required
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Completed work">
                  <Textarea
                    value={form.completedWork}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        completedWork: event.target.value,
                      }))
                    }
                    className="min-h-28"
                    required
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Blockers">
                  <Textarea
                    value={form.blockers}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        blockers: event.target.value,
                      }))
                    }
                    className="min-h-24"
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Safety notes">
                  <Textarea
                    value={form.safetyNotes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        safetyNotes: event.target.value,
                      }))
                    }
                    className="min-h-24"
                  />
                </Field>
              </div>

              <div className="md:col-span-2 flex flex-wrap justify-end gap-2">
                <Button type="submit" variant="outline" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save draft"}
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleCreate("submit")}
                >
                  {isSubmitting ? "Submitting..." : "Save and submit"}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              You do not have any assigned projects yet. Ask a project manager or admin to
              assign you to a project before creating a field log.
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
