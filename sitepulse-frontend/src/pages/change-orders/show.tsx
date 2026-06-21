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
import {
  approveChangeOrderRequest,
  rejectChangeOrderRequest,
  submitChangeOrderRequest,
} from "@/lib/change-orders";
import type {
  ChangeOrderRecord,
  ProjectPhaseRecord,
  SessionUser,
} from "@/types";

type FormState = {
  phaseId: string;
  title: string;
  description: string;
  reason: string;
  requestedAmount: string;
  requestedDays: string;
};

type ReviewState = {
  approvedAmount: string;
  approvedDays: string;
  reviewNotes: string;
  rejectionNotes: string;
};

const buildForm = (record?: ChangeOrderRecord | null): FormState => ({
  phaseId: record?.phaseId ?? "",
  title: record?.title ?? "",
  description: record?.description ?? "",
  reason: record?.reason ?? "",
  requestedAmount: String(record?.requestedAmount ?? 0),
  requestedDays: String(record?.requestedDays ?? 0),
});

const buildReviewState = (record?: ChangeOrderRecord | null): ReviewState => ({
  approvedAmount: String(record?.approvedAmount ?? record?.requestedAmount ?? 0),
  approvedDays: String(record?.approvedDays ?? record?.requestedDays ?? 0),
  reviewNotes: record?.reviewNotes ?? "",
  rejectionNotes: record?.status === "rejected" ? record.reviewNotes ?? "" : "",
});

const statusVariant: Record<
  ChangeOrderRecord["status"],
  "secondary" | "default" | "destructive" | "outline"
> = {
  draft: "outline",
  submitted: "secondary",
  approved: "default",
  rejected: "destructive",
};

export default function ChangeOrdersShowPage() {
  const { id } = useResourceParams();
  const { data: identity } = useGetIdentity<SessionUser>();
  const { open } = useNotification();
  const updateChangeOrder = useUpdate<ChangeOrderRecord>();

  const changeOrderQuery = useOne<ChangeOrderRecord>({
    resource: "change-orders",
    id: id ?? "",
    queryOptions: {
      enabled: Boolean(id),
    },
  });

  const changeOrder = changeOrderQuery.result;
  const [form, setForm] = useState<FormState>(buildForm());
  const [review, setReview] = useState<ReviewState>(buildReviewState());

  useEffect(() => {
    if (changeOrder) {
      setForm(buildForm(changeOrder));
      setReview(buildReviewState(changeOrder));
    }
  }, [changeOrder]);

  const phasesQuery = useList<ProjectPhaseRecord>({
    resource: "project-phases",
    filters: changeOrder?.projectId
      ? [
          {
            field: "projectId",
            operator: "eq",
            value: changeOrder.projectId,
          },
        ]
      : [],
    pagination: {
      currentPage: 1,
      pageSize: 100,
    },
    queryOptions: {
      enabled: Boolean(changeOrder?.projectId),
    },
  });

  const phases = phasesQuery.result.data ?? [];
  const canEditDraft =
    changeOrder?.status === "draft" && identity?.role !== USER_ROLES.CLIENT;
  const canSubmit =
    changeOrder?.status === "draft" &&
    (identity?.role === USER_ROLES.ADMIN ||
      identity?.role === USER_ROLES.PROJECT_MANAGER);
  const canReview =
    changeOrder?.status === "submitted" &&
    (identity?.role === USER_ROLES.ADMIN ||
      identity?.role === USER_ROLES.PROJECT_MANAGER) &&
    changeOrder?.canReview !== false;

  const refetch = async () => {
    await changeOrderQuery.query.refetch();
  };

  const saveDraft = async () => {
    if (!changeOrder?.id) {
      return;
    }

    try {
      await updateChangeOrder.mutateAsync({
        resource: "change-orders",
        id: changeOrder.id,
        values: {
          projectId: changeOrder.projectId,
          phaseId: form.phaseId || null,
          title: form.title,
          description: form.description,
          reason: form.reason,
          requestedAmount: Number(form.requestedAmount),
          requestedDays: Number(form.requestedDays),
          status: "draft",
        },
      });
      await refetch();
      open?.({
        type: "success",
        message: "Draft updated",
        description: "The change order draft has been saved.",
      });
    } catch (error) {
      open?.({
        type: "error",
        message: "Draft update failed",
        description:
          error instanceof Error ? error.message : "Unable to update this draft.",
      });
    }
  };

  const submitDraft = async () => {
    if (!changeOrder?.id) {
      return;
    }

    try {
      await submitChangeOrderRequest(changeOrder.id);
      await refetch();
      open?.({
        type: "success",
        message: "Change order submitted",
        description: "The request is now ready for manager review.",
      });
    } catch (error) {
      open?.({
        type: "error",
        message: "Submission failed",
        description:
          error instanceof Error ? error.message : "Unable to submit this change order.",
      });
    }
  };

  const approve = async () => {
    if (!changeOrder?.id) {
      return;
    }

    try {
      await approveChangeOrderRequest(changeOrder.id, {
        approvedAmount: Number(review.approvedAmount),
        approvedDays: Number(review.approvedDays),
        reviewNotes: review.reviewNotes || null,
      });
      await refetch();
      open?.({
        type: "success",
        message: "Change order approved",
        description: "The request has been approved and is now client-visible.",
      });
    } catch (error) {
      open?.({
        type: "error",
        message: "Approval failed",
        description:
          error instanceof Error ? error.message : "Unable to approve this change order.",
      });
    }
  };

  const reject = async () => {
    if (!changeOrder?.id) {
      return;
    }

    try {
      await rejectChangeOrderRequest(changeOrder.id, review.rejectionNotes);
      await refetch();
      open?.({
        type: "success",
        message: "Change order rejected",
        description: "The request has been marked rejected with reviewer notes.",
      });
    } catch (error) {
      open?.({
        type: "error",
        message: "Rejection failed",
        description:
          error instanceof Error ? error.message : "Unable to reject this change order.",
      });
    }
  };

  return (
    <ShowView>
      <ShowViewHeader
        resource="change-orders"
        title={
          changeOrder
            ? `${changeOrder.projectCode ?? "Project"} · ${changeOrder.title}`
            : "Change order"
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Workflow status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant[changeOrder?.status ?? "draft"]}>
                {changeOrder?.status?.replaceAll("_", " ") ?? "loading"}
              </Badge>
              {changeOrder?.submittedAt ? (
                <span className="text-sm text-muted-foreground">
                  Submitted {new Date(changeOrder.submittedAt).toLocaleString()}
                </span>
              ) : null}
              {changeOrder?.reviewedAt ? (
                <span className="text-sm text-muted-foreground">
                  Reviewed {new Date(changeOrder.reviewedAt).toLocaleString()}
                </span>
              ) : null}
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <Meta label="Project" value={changeOrder?.projectName} />
              <Meta label="Phase" value={changeOrder?.phaseName ?? "Project-wide"} />
              <Meta
                label="Requested value"
                value={
                  changeOrder
                    ? `$${changeOrder.requestedAmount.toLocaleString("en-US")}`
                    : null
                }
              />
              <Meta
                label="Requested days"
                value={
                  changeOrder != null ? `${changeOrder.requestedDays} days` : null
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workflow actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {identity?.role === USER_ROLES.CLIENT ? (
              <p>
                This view only exposes approved change order outcomes to clients.
              </p>
            ) : (
              <>
                <p>
                  Drafts stay editable until a project manager submits them into review.
                </p>
                {canSubmit ? (
                  <Button type="button" onClick={() => void submitDraft()}>
                    Submit for review
                  </Button>
                ) : null}
                {identity?.role === USER_ROLES.SITE_SUPERVISOR &&
                changeOrder?.status === "submitted" ? (
                  <p>Site supervisors can track review progress but cannot approve.</p>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>
            {identity?.role === USER_ROLES.CLIENT ? "Approved outcome" : "Change details"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {identity?.role === USER_ROLES.CLIENT ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Meta
                label="Approved amount"
                value={
                  changeOrder?.approvedAmount != null
                    ? `$${changeOrder.approvedAmount.toLocaleString("en-US")}`
                    : "Pending"
                }
              />
              <Meta
                label="Approved schedule impact"
                value={
                  changeOrder?.approvedDays != null
                    ? `${changeOrder.approvedDays} days`
                    : "Pending"
                }
              />
              <Meta label="Scope summary" value={changeOrder?.description} />
              <Meta label="Reviewer notes" value={changeOrder?.reviewNotes ?? "None"} />
            </div>
          ) : (
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
                  disabled={!canEditDraft}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Project-wide</SelectItem>
                    {phases.map((phase) => (
                      <SelectItem key={phase.id} value={phase.id}>
                        {phase.sequence}. {phase.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Requested amount">
                <Input
                  type="number"
                  min={0}
                  value={form.requestedAmount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      requestedAmount: event.target.value,
                    }))
                  }
                  disabled={!canEditDraft}
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
                    disabled={!canEditDraft}
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
                    disabled={!canEditDraft}
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Reason">
                  <Textarea
                    value={form.reason}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        reason: event.target.value,
                      }))
                    }
                    className="min-h-24"
                    disabled={!canEditDraft}
                  />
                </Field>
              </div>

              <Field label="Requested days">
                <Input
                  type="number"
                  min={0}
                  value={form.requestedDays}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      requestedDays: event.target.value,
                    }))
                  }
                  disabled={!canEditDraft}
                />
              </Field>

              <div className="md:col-span-2 flex flex-wrap gap-2">
                {canEditDraft ? <Button type="submit">Save draft</Button> : null}
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {identity?.role !== USER_ROLES.CLIENT ? (
        <Card>
          <CardHeader>
            <CardTitle>Manager review</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <Field label="Approved amount">
              <Input
                type="number"
                min={0}
                value={review.approvedAmount}
                onChange={(event) =>
                  setReview((current) => ({
                    ...current,
                    approvedAmount: event.target.value,
                  }))
                }
                disabled={!canReview}
              />
            </Field>
            <Field label="Approved days">
              <Input
                type="number"
                min={0}
                value={review.approvedDays}
                onChange={(event) =>
                  setReview((current) => ({
                    ...current,
                    approvedDays: event.target.value,
                  }))
                }
                disabled={!canReview}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Approval notes">
                <Textarea
                  value={review.reviewNotes}
                  onChange={(event) =>
                    setReview((current) => ({
                      ...current,
                      reviewNotes: event.target.value,
                    }))
                  }
                  className="min-h-24"
                  disabled={!canReview}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Rejection notes">
                <Textarea
                  value={review.rejectionNotes}
                  onChange={(event) =>
                    setReview((current) => ({
                      ...current,
                      rejectionNotes: event.target.value,
                    }))
                  }
                  className="min-h-24"
                  disabled={!canReview}
                />
              </Field>
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void approve()}
                disabled={!canReview}
              >
                Approve change order
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void reject()}
                disabled={!canReview || review.rejectionNotes.trim().length < 5}
              >
                Reject change order
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </ShowView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="text-sm font-medium">{value ?? "Not set"}</div>
    </div>
  );
}
