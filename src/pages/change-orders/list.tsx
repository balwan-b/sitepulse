import type { ColumnDef } from "@tanstack/react-table";
import { useGetIdentity } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";

import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { ShowButton } from "@/components/refine-ui/buttons/show";
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { USER_ROLES } from "@/constants";
import type { ChangeOrderRecord, SessionUser } from "@/types";

const statusVariant: Record<
  ChangeOrderRecord["status"],
  "secondary" | "default" | "destructive" | "outline"
> = {
  draft: "outline",
  submitted: "secondary",
  approved: "default",
  rejected: "destructive",
};

export default function ChangeOrdersListPage() {
  const { data: identity } = useGetIdentity<SessionUser>();

  const columns: ColumnDef<ChangeOrderRecord>[] = [
    {
      accessorKey: "title",
      header: "Change order",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.title}</p>
          <p className="text-xs text-muted-foreground">
            ${row.original.requestedAmount.toLocaleString("en-US")} requested ·{" "}
            {row.original.requestedDays} days
          </p>
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
      accessorKey: "phaseName",
      header: "Phase",
      cell: ({ row }) => row.original.phaseName ?? "Project-wide",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={statusVariant[row.original.status]}>
          {row.original.status.replaceAll("_", " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "reviewedAt",
      header: "Reviewed",
      cell: ({ row }) =>
        row.original.reviewedAt
          ? new Date(row.original.reviewedAt).toLocaleDateString()
          : "Pending",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <ShowButton resource="change-orders" recordItemId={row.original.id} />
      ),
    },
  ];

  const table = useTable<ChangeOrderRecord>({
    columns,
    refineCoreProps: {
      resource: "change-orders",
      pagination: {
        currentPage: 1,
        pageSize: 10,
      },
    },
  });

  const rows = table.reactTable.getRowModel().rows;
  const emptyMessage =
    identity?.role === USER_ROLES.CLIENT
      ? "Approved change orders will appear here once your project team completes review."
      : identity?.role === USER_ROLES.PROJECT_MANAGER
        ? "No change orders are visible yet. Drafts and submitted requests will appear here for review."
        : "No change orders are available yet.";

  return (
    <ListView>
      <ListViewHeader
        resource="change-orders"
        canCreate={identity?.role !== USER_ROLES.CLIENT}
      />
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
