import type { ColumnDef } from "@tanstack/react-table";
import { useGetIdentity } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";

import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { ShowButton } from "@/components/refine-ui/buttons/show";
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { USER_ROLES } from "@/constants";
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
  const emptyMessage =
    identity?.role === USER_ROLES.SITE_SUPERVISOR
      ? "No field logs yet. Your next recurring action starts by saving today's site report."
      : identity?.role === USER_ROLES.PROJECT_MANAGER
        ? "No supervisor logs are visible yet. Once field teams submit their first reports, they will appear here."
        : "No daily logs are available yet.";

  return (
    <ListView>
      <ListViewHeader
        resource="daily-logs"
        canCreate={
          identity?.role === USER_ROLES.ADMIN ||
          identity?.role === USER_ROLES.SITE_SUPERVISOR
        }
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
