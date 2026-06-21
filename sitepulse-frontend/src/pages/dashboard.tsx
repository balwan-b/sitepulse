import { useGetIdentity, useNavigation } from "@refinedev/core";
import { AlertCircle, ArrowRight, BriefcaseBusiness, Building2, ClipboardList, FolderClock, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { DASHBOARD_ROLE_COPY, USER_ROLES } from "@/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchDashboardSnapshot } from "@/lib/dashboard";
import type { DashboardRecord, SessionUser } from "@/types";

export default function DashboardPage() {
  const { data: identity } = useGetIdentity<SessionUser>();
  const { show, list } = useNavigation();
  const role = identity?.role ?? USER_ROLES.CLIENT;
  const copy = DASHBOARD_ROLE_COPY[role];
  const Icon = copy.icon;
  const [dashboard, setDashboard] = useState<DashboardRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const snapshot = await fetchDashboardSnapshot();
        if (!cancelled) {
          setDashboard(snapshot);
          setError(null);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unable to load dashboard data.",
          );
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = dashboard?.stats;
  const spotlightProjects = dashboard?.spotlightProjects ?? [];
  const recentEvents = dashboard?.recentEvents ?? [];
  const alerts = dashboard?.alerts ?? [];

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="sitepulse-hero rounded-[1.6rem] border px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <Badge variant="secondary" className="px-2.5 py-1 text-xs font-medium">
                {role.replaceAll("_", " ")}
              </Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-normal">
                  {copy.title}
                </h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  {copy.summary}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border bg-background/80 p-3 shadow-sm">
              <Icon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {buildHeroMetrics(role, stats).map((item) => (
              <div key={item.label} className="rounded-2xl border bg-background/72 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-semibold">{item.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Shift brief</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Signed in
              </p>
              <p className="mt-1 font-medium text-foreground">
                {identity?.name ?? "SitePulse user"}
              </p>
              <p>{identity?.email ?? "session unavailable"}</p>
            </div>
            <div className="space-y-2">
              {alerts.length ? (
                alerts.map((item) => (
                  <div key={item} className="rounded-xl border bg-muted/45 px-3 py-3">
                    {item}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border bg-muted/45 px-3 py-3">
                  Dashboard signals will appear here once data finishes loading.
                </div>
              )}
            </div>
            {error ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-3 text-destructive">
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Role queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {buildRoleQueue(role, stats).map((item) => (
              <button
                key={item.label}
                type="button"
                className="flex w-full items-start justify-between rounded-2xl border px-4 py-4 text-left transition-colors hover:bg-muted/40"
                onClick={() => list(item.resource)}
              >
                <div className="space-y-1">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.note}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold">{item.value}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    live
                  </p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Primary actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {buildPrimaryActions(role).map((item) => (
              <Button
                key={item.label}
                variant={item.variant}
                className="h-auto w-full justify-between rounded-2xl px-4 py-4"
                onClick={() => {
                  if (item.action === "show" && spotlightProjects[0]?.id) {
                    show("projects", spotlightProjects[0].id);
                    return;
                  }

                  if (item.action === "list") {
                    list(item.resource);
                  }
                }}
              >
                <span className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Project spotlight</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {spotlightProjects.length ? (
              spotlightProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className="flex w-full items-start justify-between rounded-2xl border px-4 py-4 text-left transition-colors hover:bg-muted/35"
                  onClick={() => show("projects", project.id)}
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      {project.code} · {project.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {project.clientName} · {project.location}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Badge variant="outline">{project.status.replaceAll("_", " ")}</Badge>
                      <Badge variant="secondary">{project.phaseCount} phases</Badge>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{project.openPunchItems} open punch</p>
                    <p>{project.submittedChangeOrders} pending COs</p>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No visible projects are available for this dashboard yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentEvents.length ? (
              recentEvents.map((event) => (
                <div key={event.id} className="rounded-2xl border px-4 py-4">
                  <p className="text-sm font-medium">{event.summary}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[event.projectCode, event.projectName].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {event.createdAt
                      ? new Date(event.createdAt).toLocaleString()
                      : "Recently"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Project activity will appear here as transitions and approvals land.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

const buildHeroMetrics = (
  role: SessionUser["role"],
  stats?: DashboardRecord["stats"] | null,
) => {
  const safeStats = stats ?? {
    totalVisibleProjects: 0,
    activeProjects: 0,
    atRiskProjects: 0,
    openPunchItems: 0,
    overduePunchItems: 0,
    submittedDailyLogs: 0,
    draftDailyLogs: 0,
    pendingChangeOrders: 0,
    approvedChangeOrders: 0,
    totalPhases: 0,
    totalAssignments: 0,
  };

  if (role === USER_ROLES.ADMIN) {
    return [
      {
        label: "Visible projects",
        value: safeStats.totalVisibleProjects,
        note: `${safeStats.activeProjects} active, ${safeStats.atRiskProjects} at risk`,
      },
      {
        label: "Assignments",
        value: safeStats.totalAssignments,
        note: `${safeStats.totalPhases} configured phases in scope`,
      },
      {
        label: "Pending approvals",
        value: safeStats.pendingChangeOrders,
        note: "Submitted change orders awaiting decision",
      },
    ];
  }

  if (role === USER_ROLES.PROJECT_MANAGER) {
    return [
      {
        label: "Active jobs",
        value: safeStats.activeProjects,
        note: `${safeStats.totalVisibleProjects} visible projects in scope`,
      },
      {
        label: "Open field issues",
        value: safeStats.openPunchItems,
        note: `${safeStats.overduePunchItems} overdue for follow-up`,
      },
      {
        label: "Submitted change orders",
        value: safeStats.pendingChangeOrders,
        note: "Review queue for commercial decisions",
      },
    ];
  }

  if (role === USER_ROLES.SITE_SUPERVISOR) {
    return [
      {
        label: "Draft reports",
        value: safeStats.draftDailyLogs,
        note: `${safeStats.submittedDailyLogs} already submitted`,
      },
      {
        label: "Open punch items",
        value: safeStats.openPunchItems,
        note: `${safeStats.overduePunchItems} overdue in field scope`,
      },
      {
        label: "Visible projects",
        value: safeStats.totalVisibleProjects,
        note: "Assigned jobs currently accessible",
      },
    ];
  }

  return [
    {
      label: "Active projects",
      value: safeStats.activeProjects,
      note: `${safeStats.totalVisibleProjects} visible in your portal`,
    },
    {
      label: "Approved change orders",
      value: safeStats.approvedChangeOrders,
      note: "Commercial approvals made visible to clients",
    },
    {
      label: "Project phases",
      value: safeStats.totalPhases,
      note: "Milestones available for progress review",
    },
  ];
};

const buildRoleQueue = (
  role: SessionUser["role"],
  stats?: DashboardRecord["stats"] | null,
) => {
  const safeStats = stats ?? {
    totalVisibleProjects: 0,
    activeProjects: 0,
    atRiskProjects: 0,
    openPunchItems: 0,
    overduePunchItems: 0,
    submittedDailyLogs: 0,
    draftDailyLogs: 0,
    pendingChangeOrders: 0,
    approvedChangeOrders: 0,
    totalPhases: 0,
    totalAssignments: 0,
  };

  if (role === USER_ROLES.ADMIN) {
    return [
      {
        label: "Projects needing attention",
        value: safeStats.atRiskProjects,
        note: "Use the projects board to rebalance ownership and risk.",
        resource: "projects",
      },
      {
        label: "Staff deployment coverage",
        value: safeStats.totalAssignments,
        note: "Review assignment density across visible projects.",
        resource: "users",
      },
    ];
  }

  if (role === USER_ROLES.PROJECT_MANAGER) {
    return [
      {
        label: "Change orders to review",
        value: safeStats.pendingChangeOrders,
        note: "Submitted requests should not stall the client workflow.",
        resource: "change-orders",
      },
      {
        label: "Overdue punch items",
        value: safeStats.overduePunchItems,
        note: "Field issues need ownership and closure planning.",
        resource: "punch-items",
      },
    ];
  }

  if (role === USER_ROLES.SITE_SUPERVISOR) {
    return [
      {
        label: "Draft daily logs",
        value: safeStats.draftDailyLogs,
        note: "Complete and submit field reporting before shift close.",
        resource: "daily-logs",
      },
      {
        label: "Open punch items",
        value: safeStats.openPunchItems,
        note: "Keep corrective work moving toward review.",
        resource: "punch-items",
      },
    ];
  }

  return [
    {
      label: "Approved change orders",
      value: safeStats.approvedChangeOrders,
      note: "Commercial approvals visible in the client workspace.",
      resource: "change-orders",
    },
    {
      label: "Active projects",
      value: safeStats.activeProjects,
      note: "Current construction efforts available for progress review.",
      resource: "projects",
    },
  ];
};

const buildPrimaryActions = (role: SessionUser["role"]) => {
  if (role === USER_ROLES.ADMIN) {
    return [
      { label: "Review project portfolio", resource: "projects", action: "list", icon: Building2, variant: "default" as const },
      { label: "Check staff directory", resource: "users", action: "list", icon: ShieldCheck, variant: "outline" as const },
      { label: "Inspect latest project", resource: "projects", action: "show", icon: FolderClock, variant: "secondary" as const },
    ];
  }

  if (role === USER_ROLES.PROJECT_MANAGER) {
    return [
      { label: "Open review queue", resource: "change-orders", action: "list", icon: ClipboardList, variant: "default" as const },
      { label: "Inspect project health", resource: "projects", action: "list", icon: TriangleAlert, variant: "outline" as const },
      { label: "Latest project detail", resource: "projects", action: "show", icon: FolderClock, variant: "secondary" as const },
    ];
  }

  if (role === USER_ROLES.SITE_SUPERVISOR) {
    return [
      { label: "View daily logs", resource: "daily-logs", action: "list", icon: ClipboardList, variant: "default" as const },
      { label: "Track punch items", resource: "punch-items", action: "list", icon: AlertCircle, variant: "outline" as const },
      { label: "Open assigned project", resource: "projects", action: "show", icon: FolderClock, variant: "secondary" as const },
    ];
  }

  return [
    { label: "Browse active projects", resource: "projects", action: "list", icon: Building2, variant: "default" as const },
    { label: "Open approved changes", resource: "change-orders", action: "list", icon: BriefcaseBusiness, variant: "outline" as const },
    { label: "Go to client portal", resource: "client-portal", action: "list", icon: BriefcaseBusiness, variant: "secondary" as const },
  ];
};
