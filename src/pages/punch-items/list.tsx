import type { ColumnDef } from "@tanstack/react-table";
import { useGetIdentity } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";

import { USER_ROLES } from "@/constants";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { ShowButton } from "@/components/refine-ui/buttons/show";
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { PunchItemRecord, SessionUser } from "@/types";

const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString();

const severityVariant: Record<PunchItemRecord["severity"], "default" | "secondary" | "destructive" | "outline"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  critical: "destructive",
};

export default function PunchItemsListPage() {
  const { data: identity } = useGetIdentity<SessionUser>();

  const columns: ColumnDef<PunchItemRecord>[] = [
    {
      accessorKey: "title",
      header: "Issue",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.title}</p>
          <p className="text-xs text-muted-foreground">{row.original.location}</p>
        </div>
      ),
    },
    {
      accessorKey: "projectCode",
      header: "Project",
      cell: ({ row }) =>
        [row.original.projectCode, row.original.projectName].filter(Boolean).join(" · "),
    },
    {
      accessorKey: "severity",
      header: "Severity",
      cell: ({ row }) => (
        <Badge variant={severityVariant[row.original.severity]}>
          {row.original.severity}
        </Badge>
      ),
    },
    {
      accessorKey: "dueDate",
      header: "Due",
      cell: ({ row }) => (
        <div className={row.original.isOverdue ? "font-medium text-destructive" : ""}>
          {formatDate(row.original.dueDate)}
          {row.original.isOverdue ? (
            <p className="text-xs text-destructive">Overdue</p>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.original.status.replaceAll("_", " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "assigneeName",
      header: "Assignee",
      cell: ({ row }) => row.original.assigneeName ?? "Unassigned",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <ShowButton resource="punch-items" recordItemId={row.original.id} />
      ),
    },
  ];

  const table = useTable<PunchItemRecord>({
    columns,
    refineCoreProps: {
      resource: "punch-items",
      pagination: {
        currentPage: 1,
        pageSize: 10,
      },
    },
  });

  const rows = table.reactTable.getRowModel().rows;
  const emptyMessage =
    identity?.role === USER_ROLES.PROJECT_MANAGER
      ? "No field issues are open yet. Overdue and open work will surface here as soon as crews start logging punch items."
      : identity?.role === USER_ROLES.SITE_SUPERVISOR
        ? "No punch items yet. Capture the first field issue here when something needs follow-up."
        : "No punch items are available yet.";

  return (
    <ListView>
      <ListViewHeader resource="punch-items" />
      {rows.length ? (
        <DataTable table={table} />
      ) : (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            {emptyMessage}
          </CardContent>
        </Card>
      )}
    </ListView>
  );
}
