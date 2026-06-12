import {
  useGetIdentity,
  useList,
  useNotification,
  useOne,
  useResourceParams,
  useUpdate,
} from "@refinedev/core";
import { useEffect, useState, type ReactNode } from "react";

import { ShowView, ShowViewHeader } from "@/components/refine-ui/views/show-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { USER_ROLES } from "@/constants";
import { submitDailyLogRequest } from "@/lib/daily-logs";
import type { DailyLogRecord, ProjectPhaseRecord, SessionUser } from "@/types";

type DraftFormState = {
  phaseId: string;
  logDate: string;
  workforceCount: string;
  weather: string;
  completedWork: string;
  blockers: string;
  safetyNotes: string;
};

const buildDraftForm = (log?: DailyLogRecord | null): DraftFormState => ({
  phaseId: log?.phaseId ?? "",
  logDate: log?.logDate ?? new Date().toISOString().slice(0, 10),
  workforceCount: String(log?.workforceCount ?? 0),
  weather: log?.weather ?? "",
  completedWork: log?.completedWork ?? "",
  blockers: log?.blockers ?? "",
  safetyNotes: log?.safetyNotes ?? "",
});

export default function DailyLogsShowPage() {
  const { id } = useResourceParams();
  const { data: identity } = useGetIdentity<SessionUser>();
  const { open } = useNotification();
  const updateDailyLog = useUpdate<DailyLogRecord>();

  const dailyLogQuery = useOne<DailyLogRecord>({
    resource: "daily-logs",
    id: id ?? "",
    queryOptions: {
      enabled: Boolean(id),
    },
  });

  const dailyLog = dailyLogQuery.result;

  const [form, setForm] = useState<DraftFormState>(buildDraftForm());

  const phasesQuery = useList<ProjectPhaseRecord>({
    resource: "project-phases",
    filters: dailyLog?.projectId
      ? [
          {
            field: "projectId",
            operator: "eq",
            value: dailyLog.projectId,
          },
        ]
      : [],
    pagination: {
      currentPage: 1,
      pageSize: 100,
    },
    queryOptions: {
      enabled: Boolean(dailyLog?.projectId),
    },
  });

  const phases = phasesQuery.result.data ?? [];

  const canEditDraft =
    dailyLog?.status === "draft" &&
    Boolean(identity) &&
    (identity?.role === USER_ROLES.ADMIN || identity?.id === dailyLog?.supervisorId);

  useEffect(() => {
    if (dailyLog) {
      setForm(buildDraftForm(dailyLog));
    }
  }, [dailyLog]);

  const saveDraft = async () => {
    if (!dailyLog?.id) {
      return false;
    }

    try {
      const response = await updateDailyLog.mutateAsync({
        resource: "daily-logs",
        id: dailyLog.id,
        values: {
          projectId: dailyLog.projectId,
          phaseId: form.phaseId || null,
          logDate: form.logDate,
          workforceCount: Number(form.workforceCount),
          weather: form.weather,
          completedWork: form.completedWork,
          blockers: form.blockers || null,
          safetyNotes: form.safetyNotes || null,
          status: "draft",
        },
      });

      setForm(buildDraftForm(response.data));
      dailyLogQuery.query.refetch();
      open?.({
        type: "success",
        message: "Draft updated",
        description: "Your daily log changes have been saved.",
      });
      return true;
    } catch (error) {
      open?.({
        type: "error",
        message: "Draft update failed",
        description:
          error instanceof Error ? error.message : "Unable to update this daily log.",
      });
      return false;
    }
  };

  const submitDraft = async () => {
    if (!dailyLog?.id) {
      return;
    }

    try {
      const saved = await saveDraft();
      if (!saved) {
        return;
      }

      await submitDailyLogRequest(dailyLog.id);
      await dailyLogQuery.query.refetch();
      open?.({
        type: "success",
        message: "Daily log submitted",
        description: "This field report is now captured as a submitted entry.",
      });
    } catch (error) {
      open?.({
        type: "error",
        message: "Submission failed",
        description:
          error instanceof Error ? error.message : "Unable to submit this daily log.",
      });
    }
  };

  return (
    <ShowView>
      <ShowViewHeader
        resource="daily-logs"
        title={
          dailyLog
            ? `${dailyLog.projectCode ?? "Project"} · ${new Date(`${dailyLog.logDate}T00:00:00`).toLocaleDateString()}`
            : "Daily log"
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Log status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {dailyLog?.status?.replaceAll("_", " ") ?? "loading"}
              </Badge>
              {dailyLog?.submittedAt ? (
                <span className="text-sm text-muted-foreground">
                  Submitted {new Date(dailyLog.submittedAt).toLocaleString()}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Drafts stay editable until submission.
                </span>
              )}
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <Meta label="Project" value={dailyLog?.projectName} />
              <Meta label="Phase" value={dailyLog?.phaseName ?? "Project-wide"} />
              <Meta label="Supervisor" value={dailyLog?.supervisorName} />
              <Meta label="Log date" value={dailyLog?.logDate} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workflow guidance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Supervisors can keep refining drafts until the site report is ready to submit.
            </p>
            <p>
              Once submitted, the log becomes read-only and duplicate submissions for the
              same project, supervisor, and day are rejected.
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Field details</CardTitle>
        </CardHeader>
        <CardContent>
          {canEditDraft ? (
            <form
              className="grid gap-5 md:grid-cols-2"
              onSubmit={async (event) => {
                event.preventDefault();
                await saveDraft();
              }}
            >
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
                    <SelectValue />
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
                />
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
                />
              </Field>

              <Field label="Weather">
                <Input
                  value={form.weather}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      weather: event.target.value,
                    }))
                  }
                />
              </Field>

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
                <Button type="submit" variant="outline" disabled={updateDailyLog.mutation.isPending}>
                  {updateDailyLog.mutation.isPending ? "Saving..." : "Save draft"}
                </Button>
                <Button
                  type="button"
                  disabled={updateDailyLog.mutation.isPending}
                  onClick={() => void submitDraft()}
                >
                  Submit daily log
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Meta label="Workforce count" value={dailyLog?.workforceCount?.toString()} />
              <Meta label="Weather" value={dailyLog?.weather} />
              <div className="sm:col-span-2">
                <Meta label="Completed work" value={dailyLog?.completedWork} />
              </div>
              <div className="sm:col-span-2">
                <Meta label="Blockers" value={dailyLog?.blockers ?? "None recorded"} />
              </div>
              <div className="sm:col-span-2">
                <Meta label="Safety notes" value={dailyLog?.safetyNotes ?? "None recorded"} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </ShowView>
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

function Meta({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value && value !== "" ? value : "Not set"}</p>
    </div>
  );
}
