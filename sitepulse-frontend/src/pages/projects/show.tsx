import { useGetIdentity, useList, useNavigation, useOne, useResourceParams } from "@refinedev/core";
import { useEffect, useState } from "react";

import { CreateButton } from "@/components/refine-ui/buttons/create";
import { ShowView, ShowViewHeader } from "@/components/refine-ui/views/show-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { USER_ROLES } from "@/constants";
import { fetchProjectTimeline } from "@/lib/dashboard";
import type {
  ChangeOrderRecord,
  CrewAssignmentRecord,
  ProjectPhaseRecord,
  ProjectRecord,
  ProjectTimelineEventRecord,
  PunchItemRecord,
  SessionUser,
} from "@/types";

const formatValue = (value: string | number | null | undefined) =>
  value == null || value === "" ? "Not set" : value;

export default function ProjectsShowPage() {
  const { id } = useResourceParams();
  const { data: identity } = useGetIdentity<SessionUser>();
  const { show } = useNavigation();
  const [timeline, setTimeline] = useState<ProjectTimelineEventRecord[]>([]);

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

  const punchItemsQuery = useList<PunchItemRecord>({
    resource: "punch-items",
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
      enabled: Boolean(id) && identity?.role !== USER_ROLES.CLIENT,
    },
  });

  const changeOrdersQuery = useList<ChangeOrderRecord>({
    resource: "change-orders",
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

  useEffect(() => {
    let cancelled = false;

    if (!id || typeof id !== "string") {
      return;
    }

    const loadTimeline = async () => {
      try {
        const events = await fetchProjectTimeline(id, 8);
        if (!cancelled) {
          setTimeline(events);
        }
      } catch {
        if (!cancelled) {
          setTimeline([]);
        }
      }
    };

    void loadTimeline();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const phases = phasesQuery.result.data ?? [];
  const assignments = assignmentsQuery.result.data ?? [];
  const punchItems = punchItemsQuery.result.data ?? [];
  const changeOrders = changeOrdersQuery.result.data ?? [];
  const approvedChangeOrders = changeOrders.filter((item) => item.status === "approved").length;
  const submittedChangeOrders = changeOrders.filter((item) => item.status === "submitted").length;
  const canCreatePhases =
    identity?.role === USER_ROLES.ADMIN || identity?.role === USER_ROLES.PROJECT_MANAGER;
  const canCreateAssignments =
    identity?.role === USER_ROLES.ADMIN || identity?.role === USER_ROLES.PROJECT_MANAGER;
  const canCreatePunchItems = identity?.role !== USER_ROLES.CLIENT;
  const canCreateChangeOrders = identity?.role !== USER_ROLES.CLIENT;

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
            <CardTitle>Operations snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="grid gap-3 sm:grid-cols-2">
              <Snapshot label="Phases" value={phases.length} />
              <Snapshot label="Assignments" value={assignments.length} />
              {identity?.role !== USER_ROLES.CLIENT ? (
                <Snapshot
                  label="Open punch items"
                  value={punchItems.filter((item) => item.status !== "closed").length}
                />
              ) : null}
              <Snapshot
                label={identity?.role === USER_ROLES.CLIENT ? "Approved change orders" : "Pending change orders"}
                value={
                  identity?.role === USER_ROLES.CLIENT
                    ? approvedChangeOrders
                    : submittedChangeOrders
                }
              />
            </div>
            <Separator />
            <div className="flex flex-wrap gap-2">
              {canCreatePhases ? (
                <CreateButton
                  resource="project-phases"
                  meta={{ initialValues: { projectId: project?.id ?? "" } }}
                />
              ) : null}
              {canCreateAssignments ? (
                <CreateButton
                  resource="crew-assignments"
                  meta={{ initialValues: { projectId: project?.id ?? "" } }}
                />
              ) : null}
              {canCreatePunchItems ? (
                <CreateButton
                  resource="punch-items"
                  meta={{ initialValues: { projectId: project?.id ?? "" } }}
                />
              ) : null}
              {canCreateChangeOrders ? (
                <>
                  <CreateButton
                    resource="change-orders"
                    meta={{ initialValues: { projectId: project?.id ?? "" } }}
                  />
                </>
              ) : null}
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

      <Card>
        <CardHeader>
          <CardTitle>Project timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {timeline.length ? (
            timeline.map((event) => (
              <div key={event.id} className="rounded-md border px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{event.eventType.replaceAll("_", " ")}</Badge>
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {event.createdAt
                      ? new Date(event.createdAt).toLocaleString()
                      : "Recently"}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium">{event.summary}</p>
                {event.createdByName ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Logged by {event.createdByName}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No timeline activity is available for this project yet.
            </p>
          )}
        </CardContent>
      </Card>
    </ShowView>
  );
}

function Snapshot({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-muted/35 px-3 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
