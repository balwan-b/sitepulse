import { useList, useNavigation } from "@refinedev/core";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ChangeOrderRecord } from "@/types";

export default function ClientPortalPage() {
  const { show } = useNavigation();
  const approvedChangeOrdersQuery = useList<ChangeOrderRecord>({
    resource: "change-orders",
    pagination: {
      currentPage: 1,
      pageSize: 5,
    },
    filters: [
      {
        field: "status",
        operator: "eq",
        value: "approved",
      },
    ],
  });

  const approvedChangeOrders = approvedChangeOrdersQuery.result.data ?? [];

  return (
    <section className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Client Portal</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Review approved change orders only. Internal draft, submission, and review steps
          stay hidden from the client-facing workspace.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approved change orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {approvedChangeOrders.length ? (
            approvedChangeOrders.map((record) => (
              <button
                key={record.id}
                type="button"
                className="flex w-full items-center justify-between rounded-md border px-3 py-3 text-left"
                onClick={() => show("change-orders", record.id)}
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{record.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {[record.projectCode, record.projectName].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="secondary">approved</Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    ${record.approvedAmount?.toLocaleString("en-US") ?? 0} ·{" "}
                    {record.approvedDays ?? 0} days
                  </p>
                </div>
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No approved change orders are visible yet.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
