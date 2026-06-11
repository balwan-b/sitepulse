import { useGetIdentity } from "@refinedev/core";
import { ArrowRight } from "lucide-react";

import { DASHBOARD_ROLE_COPY, USER_ROLES } from "@/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionUser } from "@/types";

const nextActionsByRole = {
  [USER_ROLES.ADMIN]: [
    "Create staff-managed identities for project managers and supervisors.",
    "Verify staff can only access assigned projects once Phase 2 resources land.",
  ],
  [USER_ROLES.PROJECT_MANAGER]: [
    "Prepare phase and assignment workflows for your first active project.",
    "Review approvals and resource access as project tools come online.",
  ],
  [USER_ROLES.SITE_SUPERVISOR]: [
    "Confirm your assigned project scope before daily log workflows arrive.",
    "Get ready to use punch tracking and field updates in the next phase.",
  ],
  [USER_ROLES.CLIENT]: [
    "Review restricted portal access after project assignment is configured.",
    "Approved visibility and curated updates arrive with project resources.",
  ],
} as const;

export default function DashboardPage() {
  const { data: identity } = useGetIdentity<SessionUser>();
  const role = identity?.role ?? USER_ROLES.CLIENT;
  const copy = DASHBOARD_ROLE_COPY[role];
  const Icon = copy.icon;

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-lg border bg-card px-6 py-6">
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
            <div className="rounded-md border bg-background p-3">
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between gap-4">
              <span>Signed in as</span>
              <span className="font-medium text-foreground">
                {identity?.name ?? "SitePulse user"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Email</span>
              <span className="font-medium text-foreground">
                {identity?.email ?? "session unavailable"}
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {nextActionsByRole[role].map((item) => (
          <Card key={item}>
            <CardContent className="flex items-start gap-3 p-5">
              <div className="mt-0.5 rounded-md border bg-background p-2">
                <ArrowRight className="h-4 w-4" />
              </div>
              <p className="text-sm text-muted-foreground">{item}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "Access model",
            value: "Role-based",
            note: "Public signup is restricted to clients. Staff access is admin-managed.",
          },
          {
            label: "Session source",
            value: "Better Auth",
            note: "Browser session state is synced into Refine identity and permissions.",
          },
          {
            label: "Current phase",
            value: "Phase 2",
            note: "Projects, project phases, scoped assignments, and staff directory are now wired.",
          },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xl font-semibold">{item.value}</div>
              <p className="text-sm text-muted-foreground">{item.note}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
