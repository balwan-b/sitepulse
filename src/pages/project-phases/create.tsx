import { useCreate, useGo, useList, useNotification } from "@refinedev/core";
import { useSearchParams } from "react-router";
import { useState, type ReactNode } from "react";

import { CreateView, CreateViewHeader } from "@/components/refine-ui/views/create-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { phaseStatuses } from "@/lib/schema";
import type { ProjectPhaseRecord, ProjectRecord } from "@/types";

export default function ProjectPhasesCreatePage() {
  const [searchParams] = useSearchParams();
  const go = useGo();
  const { open } = useNotification();
  const createPhase = useCreate<ProjectPhaseRecord>();
  const isSubmitting = createPhase.mutation.isPending;

  const initialProjectId = searchParams.get("projectId") ?? "";
  const [form, setForm] = useState({
    projectId: initialProjectId,
    name: "",
    sequence: "1",
    status: "not_started",
  });

  const { result: projectsResult } = useList<ProjectRecord>({
    resource: "projects",
    pagination: {
      currentPage: 1,
      pageSize: 100,
    },
  });

  const projects = projectsResult.data ?? [];

  return (
    <CreateView>
      <CreateViewHeader resource="project-phases" title="Create project phase" />
      <Card>
        <CardHeader>
          <CardTitle>Phase details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-5 md:grid-cols-2"
            onSubmit={async (event) => {
              event.preventDefault();

              try {
                const response = await createPhase.mutateAsync({
                  resource: "project-phases",
                  values: {
                    ...form,
                    sequence: Number(form.sequence),
                  },
                });

                go({
                  to: {
                    resource: "project-phases",
                    action: "show",
                    id: response.data.id,
                  },
                  type: "replace",
                });
              } catch (error) {
                open?.({
                  type: "error",
                  message: "Phase creation failed",
                  description:
                    error instanceof Error ? error.message : "Unable to create project phase.",
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

            <Field label="Sequence">
              <Input
                type="number"
                min="1"
                value={form.sequence}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sequence: event.target.value,
                  }))
                }
                required
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Phase name">
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
            </div>

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
                  {phaseStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create phase"}
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
