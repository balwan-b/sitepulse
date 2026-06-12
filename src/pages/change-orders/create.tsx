import { useCreate, useGo, useList, useNotification } from "@refinedev/core";
import { useSearchParams } from "react-router";
import { useState, type ReactNode } from "react";

import { CreateView, CreateViewHeader } from "@/components/refine-ui/views/create-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  ChangeOrderRecord,
  ProjectPhaseRecord,
  ProjectRecord,
} from "@/types";

type FormState = {
  projectId: string;
  phaseId: string;
  title: string;
  description: string;
  reason: string;
  requestedAmount: string;
  requestedDays: string;
};

const initialForm = (projectId: string): FormState => ({
  projectId,
  phaseId: "",
  title: "",
  description: "",
  reason: "",
  requestedAmount: "",
  requestedDays: "0",
});

export default function ChangeOrdersCreatePage() {
  const [searchParams] = useSearchParams();
  const { open } = useNotification();
  const go = useGo();
  const createChangeOrder = useCreate<ChangeOrderRecord>();
  const initialProjectId = searchParams.get("projectId") ?? "";
  const [form, setForm] = useState<FormState>(initialForm(initialProjectId));

  const projectsQuery = useList<ProjectRecord>({
    resource: "projects",
    pagination: {
      currentPage: 1,
      pageSize: 100,
    },
  });

  const phasesQuery = useList<ProjectPhaseRecord>({
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

  const projects = projectsQuery.result.data ?? [];
  const phases = phasesQuery.result.data ?? [];

  return (
    <CreateView>
      <CreateViewHeader resource="change-orders" title="Create change order" />
      <Card>
        <CardHeader>
          <CardTitle>Scope change request</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length ? (
            <form
              className="grid gap-5 md:grid-cols-2"
              onSubmit={async (event) => {
                event.preventDefault();

                try {
                  const response = await createChangeOrder.mutateAsync({
                    resource: "change-orders",
                    values: {
                      projectId: form.projectId,
                      phaseId: form.phaseId || null,
                      title: form.title,
                      description: form.description,
                      reason: form.reason,
                      requestedAmount: Number(form.requestedAmount),
                      requestedDays: Number(form.requestedDays),
                      status: "draft",
                    },
                  });

                  go({
                    to: {
                      resource: "change-orders",
                      action: "show",
                      id: response.data.id,
                    },
                    type: "replace",
                  });
                } catch (error) {
                  open?.({
                    type: "error",
                    message: "Change order creation failed",
                    description:
                      error instanceof Error
                        ? error.message
                        : "Unable to create this change order.",
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
                    <SelectItem value="none">Project-wide</SelectItem>
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
                    placeholder="Additional drainage trench at loading dock"
                    required
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Scope description">
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
                    required
                  />
                </Field>
              </div>

              <Field label="Requested amount">
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  value={form.requestedAmount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      requestedAmount: event.target.value,
                    }))
                  }
                  placeholder="25000"
                  required
                />
              </Field>

              <Field label="Schedule impact (days)">
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
                  required
                />
              </Field>

              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">
                  Save the draft first, then a project manager can submit it into the
                  approval workflow from the detail page.
                </p>
              </div>

              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={createChangeOrder.mutation.isPending}>
                  {createChangeOrder.mutation.isPending
                    ? "Creating..."
                    : "Create change order"}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              No visible projects are available for change orders yet.
            </p>
          )}
        </CardContent>
      </Card>
    </CreateView>
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
