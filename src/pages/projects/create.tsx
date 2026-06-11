import { useCreate, useGo, useList, useNotification } from "@refinedev/core";
import { useState, type ReactNode } from "react";

import { CreateView, CreateViewHeader } from "@/components/refine-ui/views/create-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { projectStatuses } from "@/lib/schema";
import type { ProjectRecord, SiteUserRecord } from "@/types";

const today = new Date().toISOString().slice(0, 10);

export default function ProjectsCreatePage() {
  const go = useGo();
  const { open } = useNotification();
  const createProject = useCreate<ProjectRecord>();
  const isSubmitting = createProject.mutation.isPending;

  const { result: managersResult } = useList<SiteUserRecord>({
    resource: "users",
    filters: [
      {
        field: "role",
        operator: "eq",
        value: "project_manager",
      },
    ],
    pagination: {
      currentPage: 1,
      pageSize: 100,
    },
  });

  const managers = managersResult.data ?? [];

  const [form, setForm] = useState({
    code: "",
    name: "",
    clientName: "",
    location: "",
    contractValue: "",
    startDate: today,
    endDate: "",
    status: "planning",
    projectManagerId: "",
  });

  return (
    <CreateView>
      <CreateViewHeader resource="projects" title="Create project" />
      <Card>
        <CardHeader>
          <CardTitle>Project details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-5 md:grid-cols-2"
            onSubmit={async (event) => {
              event.preventDefault();

              try {
                const response = await createProject.mutateAsync({
                  resource: "projects",
                  values: {
                    ...form,
                    contractValue: Number(form.contractValue),
                    projectManagerId: form.projectManagerId || null,
                    endDate: form.endDate || null,
                  },
                });

                go({
                  to: {
                    resource: "projects",
                    action: "show",
                    id: response.data.id,
                  },
                  type: "replace",
                });
              } catch (error) {
                open?.({
                  type: "error",
                  message: "Project creation failed",
                  description:
                    error instanceof Error ? error.message : "Unable to create project.",
                });
              }
            }}
          >
            <Field label="Project code">
              <Input
                value={form.code}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
                required
              />
            </Field>
            <Field label="Project name">
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
              />
            </Field>
            <Field label="Client name">
              <Input
                value={form.clientName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    clientName: event.target.value,
                  }))
                }
                required
              />
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
                required
              />
            </Field>
            <Field label="Contract value">
              <Input
                type="number"
                min="0"
                value={form.contractValue}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    contractValue: event.target.value,
                  }))
                }
                required
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    status: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projectStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replaceAll("_", " ")}
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
            <div className="md:col-span-2">
              <Field label="Project manager">
                <Select
                  value={form.projectManagerId || "unassigned"}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      projectManagerId: value === "unassigned" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {managers.map((manager: SiteUserRecord) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.name} · {manager.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create project"}
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
