import { useList, useNavigation, useOne, useResourceParams } from "@refinedev/core";

import { CreateButton } from "@/components/refine-ui/buttons/create";
import { ShowView, ShowViewHeader } from "@/components/refine-ui/views/show-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { CrewAssignmentRecord, ProjectPhaseRecord, ProjectRecord } from "@/types";

const formatValue = (value: string | number | null | undefined) =>
  value == null || value === "" ? "Not set" : value;

export default function ProjectsShowPage() {
  const { id } = useResourceParams();
  const { show } = useNavigation();

  const projectQuery = useOne<ProjectRecord>({
    resource: "projects",
    id: id ?? "",
    queryOptions: {
      enabled: Boolean(id),
    },
  });

  const project = projectQuery.result;

  const phasesQuery = useList<ProjectPhaseRecord>({
    resource: "project-phases",
    filters: id
      ? [
          {
            field: "projectId",
            operator: "eq",
            value: id,
          },
        ]
      : [],
    pagination: {
      currentPage: 1,
      pageSize: 20,
    },
    queryOptions: {
      enabled: Boolean(id),
    },
  });

  const assignmentsQuery = useList<CrewAssignmentRecord>({
    resource: "crew-assignments",
    filters: id
      ? [
          {
            field: "projectId",
            operator: "eq",
            value: id,
          },
        ]
      : [],
    pagination: {
      currentPage: 1,
      pageSize: 20,
    },
    queryOptions: {
      enabled: Boolean(id),
    },
  });

  const phases = phasesQuery.result.data ?? [];
  const assignments = assignmentsQuery.result.data ?? [];

  return (
    <ShowView>
      <ShowViewHeader
        resource="projects"
        title={project ? `${project.code} · ${project.name}` : "Project"}
      />

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {[
              ["Client", project?.clientName],
              ["Location", project?.location],
              ["Status", project?.status?.replaceAll("_", " ")],
              ["Manager", project?.projectManagerName],
              ["Contract Value", project?.contractValue?.toLocaleString("en-US")],
              ["Start Date", project?.startDate ? new Date(project.startDate).toLocaleDateString() : null],
              ["End Date", project?.endDate ? new Date(project.endDate).toLocaleDateString() : null],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-sm font-medium">{formatValue(value)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Use this project as the anchor for early phase and staffing workflows.</p>
            <Separator />
            <div className="flex flex-wrap gap-2">
              <CreateButton
                resource="project-phases"
                meta={{ initialValues: { projectId: project?.id ?? "" } }}
              />
              <CreateButton
                resource="crew-assignments"
                meta={{ initialValues: { projectId: project?.id ?? "" } }}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Phases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {phases.length ? (
              phases.map((phase: ProjectPhaseRecord) => (
                <button
                  key={phase.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md border px-3 py-3 text-left"
                  onClick={() => show("project-phases", phase.id)}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {phase.sequence}. {phase.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {phase.status.replaceAll("_", " ")}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                {projectQuery.query.isLoading
                  ? "Loading phases..."
                  : "No phases have been created yet."}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Crew Assignments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignments.length ? (
              assignments.map((assignment: CrewAssignmentRecord) => (
                <div key={assignment.id} className="rounded-md border px-3 py-3">
                  <p className="text-sm font-medium">{assignment.userName}</p>
                  <p className="text-sm text-muted-foreground">
                    {assignment.assignedRole.replaceAll("_", " ")}
                    {assignment.phaseName ? ` · ${assignment.phaseName}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No crew assignments exist for this project yet.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </ShowView>
  );
}
