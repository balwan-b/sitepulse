import type { ColumnDef } from "@tanstack/react-table";
import { useGetIdentity } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";

import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { ShowButton } from "@/components/refine-ui/buttons/show";
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CardHeader, CardTitle } from "@/components/ui/card";
import type { PunchItemRecord, SessionUser } from "@/types";
import { getPunchItemsEmptyState } from "@/lib/empty-states";

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
  const punchItems = table.refineCore.result.data ?? [];
  const overdueCount = punchItems.filter((item: PunchItemRecord) => item.isOverdue).length;
  const criticalCount = punchItems.filter((item: PunchItemRecord) => item.severity === "critical").length;
  const emptyMessage = getPunchItemsEmptyState(identity?.role);

  return (
    <ListView>
      <ListViewHeader resource="punch-items" />
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Open issues on page"
          value={punchItems.length}
          note={`${overdueCount} overdue and ${criticalCount} critical`}
        />
        <SummaryCard
          label="Projects affected"
          value={new Set(punchItems.map((item: PunchItemRecord) => item.projectId)).size}
          note="Visible field issue distribution"
        />
        <SummaryCard
          label="Assigned work"
          value={punchItems.filter((item: PunchItemRecord) => item.assigneeId).length}
          note="Items with a named owner already attached"
        />
      </section>
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

function SummaryCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        <p className="mt-1 text-sm text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}
