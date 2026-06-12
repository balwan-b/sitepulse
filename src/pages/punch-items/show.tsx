import {
  useGetIdentity,
  useList,
  useNotification,
  useOne,
  useResourceParams,
  useUpdate,
} from "@refinedev/core";
import { useEffect, useState, type ReactNode } from "react";

import { USER_ROLES } from "@/constants";
import { transitionPunchItemRequest } from "@/lib/punch-items";
import { punchItemSeverities } from "@/lib/schema";
import { ShowView, ShowViewHeader } from "@/components/refine-ui/views/show-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type {
  ProjectPhaseRecord,
  PunchItemRecord,
  SessionUser,
  SiteUserRecord,
} from "@/types";

type FormState = {
  phaseId: string;
  title: string;
  description: string;
  severity: PunchItemRecord["severity"];
  location: string;
  assigneeId: string;
  dueDate: string;
};

const buildForm = (item?: PunchItemRecord | null): FormState => ({
  phaseId: item?.phaseId ?? "",
  title: item?.title ?? "",
  description: item?.description ?? "",
  severity: item?.severity ?? "medium",
  location: item?.location ?? "",
  assigneeId: item?.assigneeId ?? "",
  dueDate: item?.dueDate ?? new Date().toISOString().slice(0, 10),
});

const severityVariant: Record<PunchItemRecord["severity"], "default" | "secondary" | "destructive" | "outline"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  critical: "destructive",
};

const nextStatusMap: Partial<Record<PunchItemRecord["status"], PunchItemRecord["status"]>> = {
  open: "in_progress",
  in_progress: "ready_for_review",
  ready_for_review: "closed",
};

export default function PunchItemsShowPage() {
  const { id } = useResourceParams();
  const { data: identity } = useGetIdentity<SessionUser>();
  const { open } = useNotification();
  const updatePunchItem = useUpdate<PunchItemRecord>();

  const punchItemQuery = useOne<PunchItemRecord>({
    resource: "punch-items",
    id: id ?? "",
    queryOptions: {
      enabled: Boolean(id),
    },
  });

  const punchItem = punchItemQuery.result;
  const [form, setForm] = useState<FormState>(buildForm());

  useEffect(() => {
    if (punchItem) {
      setForm(buildForm(punchItem));
    }
  }, [punchItem]);

  const { result: phasesResult } = useList<ProjectPhaseRecord>({
    resource: "project-phases",
    filters: punchItem?.projectId
      ? [
          {
            field: "projectId",
            operator: "eq",
            value: punchItem.projectId,
          },
        ]
      : [],
    pagination: {
      currentPage: 1,
      pageSize: 100,
    },
    queryOptions: {
      enabled: Boolean(punchItem?.projectId),
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

  const phases = phasesResult.data ?? [];
  const assignees = (usersResult.data ?? []).filter(
    (record) =>
      record.role === USER_ROLES.PROJECT_MANAGER ||
      record.role === USER_ROLES.SITE_SUPERVISOR,
  );
  const nextStatus = punchItem ? nextStatusMap[punchItem.status] : undefined;

  const saveDetails = async () => {
    if (!punchItem?.id) {
      return;
    }

    try {
      await updatePunchItem.mutateAsync({
        resource: "punch-items",
        id: punchItem.id,
        values: {
          projectId: punchItem.projectId,
          phaseId: form.phaseId || null,
          title: form.title,
          description: form.description,
          severity: form.severity,
          location: form.location,
          assigneeId: canAssign ? form.assigneeId || null : punchItem.assigneeId,
          dueDate: form.dueDate,
          status: punchItem.status,
        },
      });

      await punchItemQuery.query.refetch();
      open?.({
        type: "success",
        message: "Punch item updated",
        description: "Field issue details have been saved.",
      });
    } catch (error) {
      open?.({
        type: "error",
        message: "Update failed",
        description:
          error instanceof Error ? error.message : "Unable to update this punch item.",
      });
    }
  };

  const moveStatusForward = async () => {
    if (!punchItem?.id || !nextStatus) {
      return;
    }

    try {
      await transitionPunchItemRequest(punchItem.id, nextStatus);
      await punchItemQuery.query.refetch();
      open?.({
        type: "success",
        message: "Status updated",
        description: `Punch item moved to ${nextStatus.replaceAll("_", " ")}.`,
      });
    } catch (error) {
      open?.({
        type: "error",
        message: "Transition failed",
        description:
          error instanceof Error ? error.message : "Unable to move this punch item.",
      });
    }
  };

  return (
    <ShowView>
      <ShowViewHeader
        resource="punch-items"
        title={punchItem ? `${punchItem.projectCode ?? "Project"} · ${punchItem.title}` : "Punch item"}
      />

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Issue status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={severityVariant[punchItem?.severity ?? "medium"]}>
                {punchItem?.severity ?? "loading"}
              </Badge>
              <Badge variant="secondary">
                {punchItem?.status?.replaceAll("_", " ") ?? "loading"}
              </Badge>
              {punchItem?.isOverdue ? (
                <Badge variant="destructive">Overdue</Badge>
              ) : null}
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <Meta label="Project" value={punchItem?.projectName} />
              <Meta label="Phase" value={punchItem?.phaseName ?? "Project-wide"} />
              <Meta label="Due date" value={punchItem?.dueDate} />
              <Meta label="Assignee" value={punchItem?.assigneeName ?? "Unassigned"} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Use the details below to keep scope, owner, and deadline accurate as the issue
              moves through the field workflow.
            </p>
            {nextStatus ? (
              <Button type="button" onClick={() => void moveStatusForward()}>
                Move to {nextStatus.replaceAll("_", " ")}
              </Button>
            ) : (
              <p>This punch item is closed and no further status transitions are available.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Issue details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-5 md:grid-cols-2"
            onSubmit={async (event) => {
              event.preventDefault();
              await saveDetails();
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
                  <SelectItem value="none">Project-wide issue</SelectItem>
                  {phases.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {phase.sequence}. {phase.name}
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
              />
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

            <Field label="Location">
              <Input
                value={form.location}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
              />
            </Field>

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
              <Button type="submit" disabled={updatePunchItem.mutation.isPending}>
                {updatePunchItem.mutation.isPending ? "Saving..." : "Save details"}
              </Button>
            </div>
          </form>
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
