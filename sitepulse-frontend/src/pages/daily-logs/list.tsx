import type { ColumnDef } from "@tanstack/react-table";
import { useGetIdentity } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";

import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { ShowButton } from "@/components/refine-ui/buttons/show";
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { USER_ROLES } from "@/constants";
import { getDailyLogsEmptyState } from "@/lib/empty-states";
import type { DailyLogRecord, SessionUser } from "@/types";

const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString();

export default function DailyLogsListPage() {
  const { data: identity } = useGetIdentity<SessionUser>();

  const columns: ColumnDef<DailyLogRecord>[] = [
    {
      accessorKey: "logDate",
      header: "Date",
      cell: ({ getValue }) => formatDate(String(getValue())),
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
      accessorKey: "supervisorName",
      header: "Supervisor",
      cell: ({ row }) => row.original.supervisorName ?? "Unassigned",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => (
        <Badge variant="secondary">
          {String(getValue()).replaceAll("_", " ")}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <ShowButton resource="daily-logs" recordItemId={row.original.id} />
      ),
    },
  ];

  const table = useTable<DailyLogRecord>({
    columns,
    refineCoreProps: {
      resource: "daily-logs",
      pagination: {
        currentPage: 1,
        pageSize: 10,
      },
    },
  });

  const rows = table.reactTable.getRowModel().rows;
  const logs = table.refineCore.result.data ?? [];
  const draftCount = logs.filter((log: DailyLogRecord) => log.status === "draft").length;
  const submittedCount = logs.filter((log: DailyLogRecord) => log.status === "submitted").length;
  const emptyMessage = getDailyLogsEmptyState(identity?.role);

  return (
    <ListView>
      <ListViewHeader
        resource="daily-logs"
        canCreate={
          identity?.role === USER_ROLES.ADMIN ||
          identity?.role === USER_ROLES.SITE_SUPERVISOR
        }
      />
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Logs on page"
          value={logs.length}
          note={`${submittedCount} submitted and ${draftCount} drafts`}
        />
        <SummaryCard
          label="Projects represented"
          value={new Set(logs.map((log: DailyLogRecord) => log.projectId)).size}
          note="Visible active field reporting spread"
        />
        <SummaryCard
          label="Supervisors reporting"
          value={new Set(logs.map((log: DailyLogRecord) => log.supervisorId)).size}
          note="Distinct supervisors visible in this table"
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
