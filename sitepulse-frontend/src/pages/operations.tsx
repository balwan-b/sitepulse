import { useGetIdentity, useNavigation } from "@refinedev/core";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { USER_ROLES } from "@/constants";
import type { SessionUser } from "@/types";

export default function OperationsPage() {
  const { data: identity } = useGetIdentity<SessionUser>();
  const { list } = useNavigation();

  return (
    <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Operations Workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Use this space as a fast launchpad into the live project workflows. The
            dashboard handles role-specific signal; this page keeps the main staff story
            moving without dead ends.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => list("projects")}>Projects</Button>
            <Button variant="outline" onClick={() => list("daily-logs")}>
              Daily logs
            </Button>
            <Button variant="outline" onClick={() => list("punch-items")}>
              Punch items
            </Button>
            {identity?.role !== USER_ROLES.SITE_SUPERVISOR ? (
              <Button variant="secondary" onClick={() => list("change-orders")}>
                Change orders
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Who this is for</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            `admin`: rebalance staffing, inspect portfolio status, and keep access clean.
          </p>
          <p>
            `project_manager`: review approvals, supervise project risk, and unblock field teams.
          </p>
          <p>
            `site_supervisor`: keep logs current and push site issues toward closure.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
